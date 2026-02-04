---
title: Schema-First 的 LLM JSON 合同测试：把“结构化输出”做成可回归的门禁（含 Mermaid 流程图 + 反例库）
date: 2026-02-02 10:00:00
categories:
  - Testing
  - AI
  - Platform Engineering
tags:
  - QA
  - Contract Testing
  - JSON Schema
  - Structured Outputs
  - Pydantic
  - CI
  - Guardrails
---

很多团队把 LLM 接进业务后，**最常见、也最隐蔽**的线上问题不是“答错了”，而是：

- 少字段 / 多字段（下游解析挂了）
- 类型不对（`"42"` vs `42`）
- 枚举值乱飞（`"high"`/`"HIGH"`/`"urgent"`）
- 一旦失败就靠“再试一次”（不可控、不可回归）

如果你的 LLM 输出最终要喂给系统（工单、风控、路由、RPA、配置变更……），那它本质上就是一个 **“接口”**。接口就该有合同（contract），并且要在 CI 里做回归。

这篇文章给 QA / 平台工程一个可落地的做法：

1) 先把输出定义成 **JSON Schema（合同）**
2) 在运行时用 **Structured Outputs / 工具调用**尽量“硬约束”
3) 在测试里做 **schema 校验 + 反例回归 + 失效归因**
4) 把结果变成 **门禁指标**：通过率、重试率、违反合同的类型分布

并配一套可以直接抄走的 `pytest` 示例。

---

## 1. 架构心智模型：把 LLM 当成一个“会漂移的上游服务”

### 1.1 一张图：合同在链路里的位置（原创）

```mermaid
flowchart LR
  U[用户输入/上游事件] --> A[Prompt/Tools 组装]
  A --> M[LLM]
  M -->|JSON| V[合同校验
(JSON Schema + 业务约束)]
  V -->|通过| D[下游系统
路由/入库/执行]
  V -->|失败| R[降级策略
重试/回退/人工队列]

  subgraph CI[CI / Nightly]
    T[固定评估集
+ 反例库] --> E[离线跑模型]
    E --> S[统计
通过率/失败类型/漂移]
    S --> G[Gate
阈值门禁]
  end

  V -. 失败样本回流 .-> T
```

核心观点：

- **合同测试不是为了让 LLM “更聪明”**，而是为了让它“更像一个可集成的组件”。
- 只要输出要被程序消费，就要把“结构正确”当作 **P0**。

---

## 2. 合同怎么写：Schema-First（先写合同，再写 prompt）

### 2.1 一个可维护的 JSON Schema（示例：工单分流）

场景：LLM 从用户描述里抽取结构化字段，供平台决定派给哪个队列。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TicketTriage",
  "type": "object",
  "additionalProperties": false,
  "required": ["intent", "priority", "summary", "signals"],
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["bug", "question", "feature_request", "incident"]
    },
    "priority": {
      "type": "string",
      "enum": ["p0", "p1", "p2", "p3"]
    },
    "summary": {"type": "string", "minLength": 5, "maxLength": 120},
    "signals": {
      "type": "object",
      "additionalProperties": false,
      "required": ["user_impact", "reproducible"],
      "properties": {
        "user_impact": {"type": "string", "enum": ["none", "low", "medium", "high"]},
        "reproducible": {"type": "boolean"},
        "error_codes": {
          "type": "array",
          "items": {"type": "string"},
          "maxItems": 5
        }
      }
    }
  }
}
```

**实践建议（QA 视角）**：

- `additionalProperties: false` 是“防幻觉”第一道门：不让模型随便塞字段。
- 枚举（`enum`）尽量用 **小写、稳定、版本化** 的 token，避免“同义词漂移”。

JSON Schema 的关键字/组合方式，官方参考见：<https://json-schema.org/understanding-json-schema/>。

---

## 3. 运行时约束：尽可能让模型“只能输出合法结构”

如果你的提供商支持 **Structured Outputs（严格遵循 schema）**，优先用它；否则就用函数/工具调用 + 校验 + 重试。

OpenAI Structured Outputs 的官方说明：<https://platform.openai.com/docs/guides/structured-outputs>。

### 3.1 Python（Pydantic 作为合同载体）

Pydantic 本质上是“把 schema 写在类型里”，并提供验证/报错信息：<https://docs.pydantic.dev/latest/>。

```python
from pydantic import BaseModel, Field
from typing import Literal, List, Optional

class Signals(BaseModel):
    user_impact: Literal["none", "low", "medium", "high"]
    reproducible: bool
    error_codes: List[str] = []

class TicketTriage(BaseModel):
    intent: Literal["bug", "question", "feature_request", "incident"]
    priority: Literal["p0", "p1", "p2", "p3"]
    summary: str = Field(min_length=5, max_length=120)
    signals: Signals
```

你可以把这段模型：

- 作为 **运行时解析/验证** 的唯一入口
- 作为 **测试用例的断言对象**
- 作为 **合同版本**（文件名/类名/字段变更都进 PR）

---

## 4. 合同测试怎么做：三层断言 + 反例库

这里给一个 QA 友好的“最小闭环”。

### 4.1 三层断言（建议顺序）

1) **Schema 断言（结构）**：字段是否齐全、类型是否正确、是否有额外字段
2) **业务断言（语义）**：比如 `intent=incident` 时 `priority` 不允许是 `p3`
3) **稳定性断言（行为）**：同一输入多次调用，输出是否在可接受范围（抖动/漂移）

### 4.2 反例库（Anti-cases）是什么？

把你线上遇到的失败样本，变成一个 `anti_cases/*.jsonl`：

```jsonl
{"id":"missing_field_001","input":"...","expected_failure":"missing:intent"}
{"id":"extra_field_002","input":"...","expected_failure":"additionalProperties:foo"}
{"id":"enum_drift_003","input":"...","expected_failure":"enum:priority"}
```

反例库的价值：

- 每次修 prompt / 升模型，都能回归“以前踩过的坑”
- 失败类型可以统计，变成 backlog：优先修最常见的合同违约

---

## 5. 可直接抄的 pytest：校验 + 失败归因 + 指标输出

下面是一个“不要依赖具体供应商 SDK”的测试骨架：`call_llm()` 由你接入实际模型。

```python
import json
import re
from collections import Counter
from pydantic import ValidationError

from models import TicketTriage  # 你的 Pydantic 合同


def call_llm(user_text: str) -> dict:
    """替换成你的模型调用：Structured Outputs / tool calling / JSON mode 都行。
    要求：返回 dict（模型输出解析后的 JSON）。
    """
    raise NotImplementedError


def classify_validation_error(e: ValidationError) -> str:
    # 让报错更“可统计”
    # 例：missing:intent / enum:priority / type:signals.reproducible
    err = e.errors()[0]
    loc = ".".join(str(x) for x in err.get("loc", []))
    typ = err.get("type", "unknown")

    if typ == "missing":
        return f"missing:{loc}"
    if "literal" in typ or "enum" in typ:
        return f"enum:{loc}"
    if "type" in typ or "int_parsing" in typ or "bool_parsing" in typ:
        return f"type:{loc}"
    return f"other:{loc}:{typ}"


def test_contract_suite(contract_dataset):
    stats = Counter()

    for row in contract_dataset:  # row: {id, input, expect_priority?, ...}
        out = call_llm(row["input"])

        try:
            triage = TicketTriage.model_validate(out)
        except ValidationError as e:
            stats[classify_validation_error(e)] += 1
            # 让 CI 直接红：合同失败就是失败
            raise

        # 业务断言示例：incident 不允许低优先级
        if triage.intent == "incident":
            assert triage.priority in {"p0", "p1"}

    # 可选：输出统计（配合 CI artifact / Prometheus）
    print("contract_failures_by_type:", dict(stats))
```

### 5.1 门禁阈值怎么定？

建议把门禁拆成两条线：

- **硬门禁**：schema 通过率必须 100%（或接近 100%，比如允许极少数已知 flaky 样本）
- **软门禁**：业务断言、稳定性指标允许有区间（例如 p95 抖动 < 2%）

如果你用的是“失败自动重试”，也要把 **重试率** 当成指标：

- 重试率上升通常意味着：模型/提示词变化导致更靠近边界
- 这类漂移在你业务爆炸前就能被 nightly 发现

---

## 6. 何时用 Pact / 合同测试框架？

如果你的系统是多服务协作（消费者/提供者），合同测试在微服务里是成熟套路。

Pact 官方文档里对 contract tests 的定位很清晰：它用合同把集成点拆开，避免“部署全世界才能测”的脆弱集成测试：<https://docs.pact.io/>。

LLM 输出作为“集成点”时也一样：

- **消费者**：下游解析/路由/存储组件
- **提供者**：LLM（+ prompt + tools）

你的合同不是 OpenAPI，而是 JSON Schema / Pydantic 模型 + 反例库。

---

## 7. 常见坑（从 QA 的角度提前埋雷）

### 7.1 “Schema 通过了，但业务还是错”

别用 schema 解决语义问题。schema 负责结构，语义用业务断言/评估集解决。

### 7.2 枚举太细导致频繁改合同

枚举不是越细越好。**先让系统稳定跑起来**，再逐步细分。

### 7.3 把重试当作成功

重试是降级，不是能力。把重试率做成 KPI，逼自己回到“可回归”。

---

## 8. 你可以从今天开始做的最小落地清单

- [ ] 为 1 个核心 LLM 输出写 JSON Schema（`additionalProperties: false`）
- [ ] 用 Pydantic/JSON Schema 校验，把验证错误变成可统计标签
- [ ] 建一个 `anti_cases.jsonl`，先塞 10 条你见过的失败
- [ ] CI 里跑：schema 通过率 + 重试率 + top 3 失败类型
- [ ] Nightly 跑同一套数据集，监控漂移

---

## 参考资料（References）

- JSON Schema 官方参考文档：<https://json-schema.org/understanding-json-schema/>
- OpenAI Structured Outputs（严格按 schema 生成）：<https://platform.openai.com/docs/guides/structured-outputs>
- Pydantic 文档（Python 数据验证/类型约束）：<https://docs.pydantic.dev/latest/>
- Pact Docs：Contract testing / Consumer-driven contracts：<https://docs.pact.io/>
- Instructor（结构化输出/类型校验与重试的开源库）：<https://github.com/567-labs/instructor>
