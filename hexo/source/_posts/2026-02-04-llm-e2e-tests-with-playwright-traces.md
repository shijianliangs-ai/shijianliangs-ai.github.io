---
title: 用 Playwright Trace 给“LLM 驱动的 UI 测试”做可回放取证：让 flaky 变得可诊断
date: 2026-02-04 10:00:00
categories:
  - AI
  - Testing
tags:
  - playwright
  - e2e
  - trace
  - observability
  - flaky-tests
  - qa
  - platform-engineering
---

LLM 让 UI 自动化变得“更会写”，但也更容易“更会漂”：

- 同一个用户故事，Agent 可能选择不同的点击路径
- 动态 UI（AB/灰度/个性化）导致 locator 选择不稳定
- 一旦失败，你看到的往往只有一行 `Timeout 30000ms exceeded`

如果你把 LLM 引入 E2E（比如：**让模型生成步骤/选择元素/自动修复 locator**），那**可回放的证据链**比“更聪明的脚本”更重要。

这篇文章给 QA/平台工程一个落地方案：

> **把 Playwright Trace 当作“测试黑匣子”**：
> - 每次失败都产出 trace（可回放 UI、网络、console、步骤、截图）
> - 在 CI 里自动上传/保留（按风险分级）
> - 给 LLM/人类同一份证据，做稳定的根因定位与修复闭环

---

## 0. 一张图：LLM + E2E 的“证据链”架构

```mermaid
flowchart LR
  A[CI job
(playwright test)] --> B[Artifacts
trace.zip + html report]
  B --> C[Artifact Store
(S3/GCS/MinIO)]
  B --> D[PR comment
link + summary]

  subgraph Triage
    E[Human QA] -->|replay| F[Trace Viewer]
    G[LLM Triage Bot] -->|analyze| F
  end

  C --> F

  F --> H[Fix
(locator / waits / data / app bug)]
  H --> A
```

关键点：**Trace 是唯一真相来源**。LLM 可以参与“分析”，但不能替代“证据”。

---

## 1) Trace 能解决什么：把 flaky 从“玄学”变成“可复现”

Playwright Trace 会记录：

- 每一步的 action（click/fill/navigate…）
- DOM 快照与截图（可回看当时页面长什么样）
- Network 请求/响应（你能看到是否接口慢、是否 500、是否被缓存）
- console 日志、错误

这对 LLM 驱动测试特别关键：**LLM 生成的步骤**往往可变，而 trace 让你能回答：

- 这次选择了哪个按钮？它当时的可见性/可点击性如何？
- 点击之后到底触发了哪些请求？响应是什么？
- 失败发生前 UI 状态是什么？是不是弹窗挡住了？是不是路由没跳？

参考：Playwright 官方对 Trace/报告能力的说明在文档中给出（Trace Viewer、HTML report 等）。

---

## 2) 最小可用配置：只给失败产出 trace（CI 成本可控）

在 `playwright.config.ts` 里把 trace 设为 `on-first-retry` 或 `retain-on-failure`。

> 推荐：
> - PR/日常：`on-first-retry`（只在重试时收集，降低开销）
> - 夜间/预发：`retain-on-failure`（失败必留）

示例：

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  use: {
    // 失败取证：要么 on-first-retry，要么 retain-on-failure
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',

    // 建议同时保留截图/视频（按团队预算取舍）
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['html', { open: 'never' }]],
});
```

跑完后，你会拿到：

- `playwright-report/`（HTML 报告）
- `test-results/**/trace.zip`（每个失败测试一个 trace）

参考：Playwright introduction 中提到测试运行、HTML report、trace viewer 的能力入口。\
（文末给链接）

---

## 3) 让 LLM 帮你“读 trace”，但要给它一套可审计输入

很多团队第一反应是：把失败日志丢给 LLM。

问题：**日志太少**，LLM 会“合理猜测”，而不是基于事实。

更靠谱的做法：

1. 先由 CI 把 trace 作为 artifact 保存
2. 再生成一个**结构化 triage 包**（文本 + 指标），LLM 只能基于它下结论

你可以把以下信息从 Playwright 测试结果中提取出来（文本化、可审计）：

- 最后 N 步 action 列表（步骤名、locator、耗时）
- 失败点的截图路径
- 失败点前后 3~5 个 network 请求（URL、status、耗时）
- console error 汇总

一个非常实用的 triage 输出（给人/LLM 都好读）：

```text
Test: checkout - apply coupon
Fail: Timeout waiting for locator("text=Apply")

Last actions:
  1) click: role=button[name="Cart"] (120ms)
  2) fill: input[name="coupon"] = "WELCOME10" (40ms)
  3) click: text=Apply (waiting 30000ms)  <-- failed

Network around failure:
  POST /api/cart/applyCoupon -> 500 (2.1s)
  GET  /api/cart            -> 200 (90ms)

Console:
  Error: Uncaught TypeError: ...
```

然后把 **trace 链接 + triage 文本**一起塞给 LLM：

- 让它给出“最可能根因”与“建议修复”（locator/等待/数据/后端 bug）
- 让它给出“需要补充的信息”（例如：是否发生重定向、是否出现 toast）

这样做能显著降低 hallucination。

> 旁证：大模型并不天然可靠，文献与技术报告强调了能力与可靠性边界；在工程上要用“证据链/审计输入”来约束它的结论。\
（见 GPT-4 Technical Report、InstructGPT 论文）

---

## 4) 针对 LLM 驱动测试的 3 类常见 flaky：trace 里怎么一眼看穿

### 4.1 Locator 漂移（UI 文案/结构变了）

症状：失败点是 `locator` 找不到/找到多个。

trace 诊断：

- 看 DOM snapshot：同名按钮是否出现了两个？是否被 disabled？
- 看 action 目标：LLM 选择的 selector 是否过于脆弱（`nth-child`、纯文本）

修复策略：

- 使用语义 locator：`getByRole()` + name（更稳定）
- 给关键元素加 `data-testid`（平台工程可统一规范）

### 4.2 等待策略错误（等待了“错误的条件”）

症状：你在等元素可见，但其实应该等 network idle / 某个请求完成。

trace 诊断：

- action timeline 里能看到 click 后发起了哪些请求
- 看到请求返回 500/慢/被重试，就知道不是 UI 问题

修复策略：

- 等待具体请求：`page.waitForResponse()`
- 等待业务状态：比如购物车接口返回后再断言 UI

### 4.3 测试数据污染/并发干扰

症状：单跑通过，CI 并行就挂。

trace 诊断：

- network 里出现 409/412（版本冲突）
- 同一账号同时登录导致被踢/被限流

修复策略：

- 数据隔离：每个 worker 独立用户/租户
- 测试前后清理：API reset / DB fixture

---

## 5) 平台工程落地：把 trace 变成“质量门禁”的一部分

你可以把 E2E 失败分层：

- **产品 bug**：失败带 5xx、JS error、断言失败
- **测试 bug**：locator 脆弱、等待不当
- **环境 bug**：依赖不可用、超时、证书

平台层建议做 3 件事：

1) **Trace 保留策略**（成本控制）
- PR：仅失败/仅首个重试
- 主干：失败保留 7~14 天
- release：关键用例全量保留（带版本号）

2) **自动归因**（可先规则后模型）
- 规则：HTTP 5xx / console error / timeout 分类
- 模型：在规则不确定时做辅助解释（必须引用 triage 包证据）

3) **安全与合规**（最容易被忽略）

Trace 可能包含：token、用户信息、截图里的 PII。

至少做到：

- 在测试账号与测试环境里跑（避免生产真实数据）
- 对 artifact 存储做访问控制与过期删除
- 对仓库做 secret 扫描，防止 trace/日志里意外混入密钥

可用工具之一：Gitleaks（支持 pre-commit/GitHub Action）。

---

## 6) 一个可直接抄的 CI 片段（GitHub Actions）

> 思路：测试失败时上传 `playwright-report` 与 `test-results`，并把链接写到 PR。

```yaml
name: e2e
on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: |
            playwright-report
            test-results
          retention-days: 14
```

把 artifact 链接贴到 PR 后，任何人（或你的 LLM triage bot）都能打开同一份证据回放。

---

## 参考资料（References）

1) Playwright Docs - Introduction（包含 Playwright Test、HTML report、Trace/调试入口）
- https://playwright.dev/docs/intro

2) Toby Clemson, *Testing Strategies in a Microservice Architecture*（分层测试策略思路，可类比把 Trace 作为“可观察性层”的一部分）
- https://martinfowler.com/articles/microservice-testing/

3) OpenAI, *GPT-4 Technical Report*（讨论模型能力与可靠性边界；工程上应使用可审计证据减少猜测）
- https://arxiv.org/abs/2303.08774

4) Ouyang et al., *Training language models to follow instructions with human feedback (InstructGPT)*（说明模型并非天然正确；需要过程约束与评估机制）
- https://arxiv.org/abs/2203.02155

5) Gitleaks（secret 扫描工具；可用于 CI/commit hook，避免 artifact/日志引入敏感信息）
- https://github.com/gitleaks/gitleaks
