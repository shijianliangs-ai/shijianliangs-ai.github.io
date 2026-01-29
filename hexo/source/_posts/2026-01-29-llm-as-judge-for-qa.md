---
title: "LLM-as-Judge 在测试工程化中的落地：从用例生成到可审计的质量门禁"
date: 2026-01-29 19:10:00
categories:
  - AI测试
tags:
  - AI
  - LLM
  - 质量工程化
  - 测试平台
---

> 适用场景：测试平台研发 / 测试流程关联 / 自动化回归  
> 关键词：LLM-as-Judge、Rubric、可审计、可回滚、质量门禁

## 为什么“LLM 生成用例”经常不靠谱？
很多团队第一步让 LLM 生成用例，常见问题是：

- 写得很像，但**缺前置条件/数据构造**
- 断言不落地，最后变成“靠感觉验”
- 覆盖点不对，**关键风险没打中**（鉴权、幂等、权限矩阵、并发一致性）

正确做法不是“让 LLM 写更多”，而是引入一个稳定的**质检环节**：

- LLM 负责 **生成候选**
- 规则 + LLM 负责 **评审打分（LLM-as-Judge）**
- 通过阈值才允许入库/进入回归

---

## 图 1：生成 → 评审 → 入库 → 回归的闭环（推荐架构）

```text
需求/PRD/接口文档
       │
       ▼
LLM 生成候选用例（草案）
       │
       ▼
规则校验（必填字段/格式/最小可执行）
       │
       ▼
LLM-as-Judge（评分 + 缺口 + 改写建议）
       │
       ├─ 不通过：回到“改写/补充”
       ▼
入库（需求-用例-接口-缺陷 关联）
       │
       ▼
自动化落地 / 回归编排 / 报告
```

这个闭环特别适合“测试平台 + 流程关联”：把“用例质量”变成一个可度量、可阻断的工程指标。

---

## 图 2：用例数据结构（让机器可评审）
为了让评审稳定，建议用 **JSON/YAML 结构化**（不要纯自然语言）：

```yaml
id: TC-API-LOGIN-001
title: 登录成功（密码模式）
scope: API
priority: P0
risk_tags: [auth, session]
preconditions:
  - 用户存在且未冻结
test_data:
  username: u_test_001
  password: "***"
steps:
  - call: POST /api/login
    body:
      username: u_test_001
      password: "***"
assertions:
  - status_code == 200
  - json.token exists
  - token usable for GET /api/me
cleanup:
  - revoke token
```

---

## LLM-as-Judge：评审维度怎么设计（可复制的 Rubric）
建议做成 6 个维度，每个 0~5 分，总分 30，设置通过阈值（例如 `>= 20`）：

| 维度 | 核心问题 | 常见缺口 |
|---|---|---|
| 可执行性 | 现在能不能跑起来？缺环境/数据吗？ | 缺“创建用户/初始化数据” |
| 可验证性 | 断言是否明确、可自动化？ | 只写“应该成功” |
| 覆盖性 | 是否覆盖关键路径 + 典型异常？ | 密码错误、冻结用户、token 过期 |
| 风险对齐 | 是否命中中台高风险点？ | 鉴权、幂等、权限矩阵、并发 |
| 可维护性 | 是否避免脆弱断言？ | 依赖随机/时间戳 |
| 可追溯性 | 能否映射到需求条款/接口字段？ | 缺需求编号/字段映射 |

**输出一定要结构化**，方便入库与统计：

```json
{
  "pass": true,
  "score": 23,
  "maxScore": 30,
  "issues": [
    {"level":"warn","field":"test_data","msg":"缺少数据构造方式，建议补充创建/清理步骤"}
  ],
  "missing_cases": [
    "密码错误返回 401 + 错误码校验",
    "冻结用户拒绝登录",
    "token 过期后的行为"
  ]
}
```

---

## 避免“自评自嗨”的 3 个技巧
1) **作者/裁判分离**：生成 prompt 与评审 prompt 分开；最好用不同系统指令，甚至不同模型。  
2) **先规则、后 LLM**：字段缺失/格式不合法直接打回，不要浪费 token。  
3) **Rubric 版本化**：把你们现有评审 checklist 做成 rubric（v1/v2），随迭代更新。

---

## 工程落地清单（两周内能上线）
- [ ] 定义用例 schema（YAML/JSON）
- [ ] 规则校验（必填字段、枚举值、最小可执行）
- [ ] Judge 输出 schema（评分/问题/缺口）
- [ ] 设置阈值：`score >= 20` 才允许入库
- [ ] 缺口写回：下一轮生成作为负面约束（避免重复缺陷）
- [ ] 平台化：需求-用例-缺陷-发布全链路关联

---

## 参考链接
- Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* (NeurIPS 2023 Datasets and Benchmarks)  
  https://arxiv.org/abs/2306.05685
- FastChat / lm-sys 的 LLM Judge 实现与数据：  
  https://github.com/lm-sys/FastChat/tree/main/fastchat/llm_judge
- DeepEval（LLM 测试/评测框架）：  
  https://github.com/confident-ai/deepeval
