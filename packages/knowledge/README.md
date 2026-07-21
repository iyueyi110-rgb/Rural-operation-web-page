# @zouma/knowledge

面向运营人员和村民的本地知识检索与回答校验包，提供 BM25 检索、角色过滤、PII 清洗和引用追溯。

## Data flow

```text
问题 → 角色校验 → PII 清洗 → BM25 检索 → 回答/拒答 → 逐字引用校验
```

- 只召回状态和角色允许的 chunk。
- 手机号、精确坐标和订单标识在检索/模型调用前清洗。
- 引用必须命中文档、版本、章节和原文 quote。
- 证据不足、权限不足、规则冲突或具体个案返回结构化状态并建议人工处理。

## Usage

```ts
import { answerKnowledgeQuestion } from "@zouma/knowledge"
import index from "@zouma/knowledge/index"

const result = await answerKnowledgeQuestion({
  index,
  question: "养护凭证需要包含什么？",
  role: "villager",
  allowDraft: true,
})
```

生产环境只应召回 `active` 文档；当前 Demo 知识源仍需完成人工发布审核。

## Evaluation

固定 24 题中，20 条可回答问题检索召回为 20/20，运营专属内容泄漏为 0。依赖可用模型的完整回答原文和其余指标尚待补齐，不应把检索结果扩大为完整生成质量结论。

```bash
pnpm --filter @zouma/knowledge build-index
pnpm --filter @zouma/knowledge test
pnpm --filter @zouma/knowledge eval
```

评测详情见 [`docs/reports/adoption-v2/rag-eval-report.md`](../../docs/reports/adoption-v2/rag-eval-report.md)。
