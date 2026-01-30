---
title: 用 SLO 驱动的负载测试：把 k6 阈值当成“可测试的可靠性合同”
date: 2026-01-30 10:00:00
categories:
  - Testing
  - Platform Engineering
tags:
  - Load Testing
  - k6
  - SLO
  - Observability
  - QA
  - CI/CD
---

很多团队做性能测试会陷入两个极端：

- **只压一把**：跑一小时压测，看 TPS/RT 图“差不多”，就结束。
- **压测工程化过度**：指标一大堆，但没有一个能直接回答“能不能上线”。

更可操作的做法是：**让负载测试围绕 SLO（Service Level Objective）来设计**，并把 SLO 转成 k6 的 `thresholds`，让它变成 CI 里可自动判定的“可靠性合同”。

这篇文章面向 QA / 平台工程：给出一套落地流程 + 可直接抄的脚本模板，最后用一张小的因果图说明为什么它能减少争论、提升回归效率。

---

## 0. 先统一语言：SLO、阈值、以及“别误用平均值”

SLO 不是“我们希望更快一些”，而是**对用户可感知体验的量化目标**。Google SRE 的经典建议是用少数核心信号（延迟、流量、错误、饱和度）来描述用户体验与系统压力（Four Golden Signals）。性能测试如果不绑定这些信号，往往会变成“压完看图说话”。

k6 的 `thresholds` 本质上是：**把某个指标的目标写成断言**，并让 k6 在测试结束时给出 pass/fail（这点跟单元测试很像）。

---

## 1) 把 SLO 变成“可执行”的 k6 阈值（SLO → SLI → Threshold）

### 1.1 选 2~3 个最有效的 SLI（建议从用户入口开始）

建议起步只选：

- **可用性/错误率**：`http_req_failed` 或按状态码分类
- **延迟分位数**：`http_req_duration` 的 p(95)/p(99)
- （可选）**关键业务检查**：业务级 `check()`（例如下单成功、登录 token 正常等）

注意：**不要用平均延迟**当主目标；平均值很容易掩盖尾部延迟问题。用分位数更贴近用户体验。

### 1.2 一个可复用的 SLO 模板

举例（你可以替换成自己的）：

- 可用性：`http_req_failed < 0.1%`
- 延迟：`p(95) < 800ms`，`p(99) < 1500ms`
- 业务正确性：关键 check 通过率 `> 99.9%`

在 k6 里写成：

```js
export const options = {
  thresholds: {
    http_req_failed: ['rate < 0.001'],
    http_req_duration: ['p(95) < 800', 'p(99) < 1500'],
    checks: ['rate > 0.999'],
  },
};
```

---

## 2) 负载模型别拍脑袋：用“闭环/开环 + 场景”表达真实流量

很多压测失败不是系统不行，而是模型不对（比如把突发流量当成恒定并发）。

在 k6 里，推荐用 `scenarios` 明确负载模型：

- **closed model（固定并发）**：更像“多少人在用”
- **open model（固定到达率）**：更像“每秒来多少请求”

下面给一个常用的“三段式”场景：升压 → 稳态 → 降压。

```js
export const options = {
  scenarios: {
    steady: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 30 },
        { duration: '10m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate < 0.001'],
    http_req_duration: ['p(95) < 800', 'p(99) < 1500'],
  },
};
```

---

## 3) 把“压测”变成“测试”：加入业务断言与可观测性标记

### 3.1 用 `check()` 做业务断言（别只看 200）

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/profile`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has userId': (r) => {
      try {
        return JSON.parse(r.body).userId != null;
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);
}
```

### 3.2 给请求打上“实验标签”，方便和监控对齐

把 release、commit、test_id 写进 header/tag，后续在日志/Tracing/指标里按标签过滤。

```js
import http from 'k6/http';

export default function () {
  http.get(`${__ENV.BASE_URL}/api/profile`, {
    headers: {
      'x-release': __ENV.RELEASE || 'local',
      'x-test-id': __ENV.TEST_ID || 'slo-k6',
    },
    tags: {
      release: __ENV.RELEASE || 'local',
      test_id: __ENV.TEST_ID || 'slo-k6',
    },
  });
}
```

---

## 4) CI 里怎么跑：让 k6 输出变成“门禁”

一个最小可用的 CI 做法：

1. PR 合并前跑 **短稳态**（比如 2~5 分钟）验证回归
2. 每日/每周跑 **长稳态 + 峰值** 作为容量趋势
3. 失败时：
   - 让 CI 产物里包含 k6 summary
   - 同步保存 dashboard 截图/链接（如果你有 Grafana/Prometheus/Cloud）

k6 的特性之一是“tests as code”，适合版本化与集成流水线（官方 repo 也强调这一点）。

---

## 5) 让争论变少的一张图：SLO 驱动压测的因果链

当你把目标写成阈值，讨论会从“你觉得快不快”变成“哪个 SLO 被破坏了，证据是什么”。

```mermaid
flowchart TD
  A[定义用户体验目标 SLO] --> B[选择可测的 SLI
(p95/p99, error rate, checks)]
  B --> C[在 k6 thresholds 写成断言]
  C --> D[用 scenarios 表达负载模型]
  D --> E[CI 自动判定 pass/fail]
  E --> F[失败自动定位线索
(标签/日志/监控对齐)]
```

---

## 6) 实战建议（踩坑总结）

- **阈值别一上来定太严**：先用历史数据回放，拿一周的真实表现来反推 p95/p99 目标。
- **分场景定阈值**：登录、搜索、下单的 SLO 可能不同；不要用一个 RT 把所有 API 一刀切。
- **把“压测失败”分类**：
  - `http_req_failed` 上升 → 先排查依赖/限流/连接池
  - p99 爆炸但错误率正常 → 看队列、GC、锁、缓存 miss
- **避免“测试冰淇淋筒”**：高层级、慢而脆的测试太多会拖垮反馈周期；压测也应尽量模块化、可复用（测试金字塔的思路同样适用）。

---

## 参考资料

- Grafana k6 项目（特性、脚本、阈值/场景等入口）：https://github.com/grafana/k6
- Google SRE Book：Monitoring Distributed Systems（四大黄金信号、告警噪音等）：https://sre.google/sre-book/monitoring-distributed-systems/
- Martin Fowler：The Practical Test Pyramid（测试组合与反馈回路）：https://martinfowler.com/articles/practical-test-pyramid.html
- Ouyang et al., 2022：InstructGPT（关于 LLM 对齐、偏好与可靠性权衡的背景阅读；当你用 AI 生成测试数据/脚本时尤其需要“可验证”的门禁）：https://arxiv.org/abs/2203.02155
