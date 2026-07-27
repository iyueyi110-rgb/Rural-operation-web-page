证据索引

本页把简历和 README 中的主要主张连接到公开证据、复现方式与适用边界。代码、测试和最新报告是仓库事实的最终依据。

## 证据等级

| 等级 | 含义 |
| --- | --- |
| A：可重复 | 固定输入、实现代码、自动化测试和公开复现命令齐全 |
| B：公开报告 | 有指标口径、结果与边界，原始运行产物按仓库规则不提交 |
| C：私有材料 | 涉及访谈或个人信息，只公开方法和结论摘要 |
| D：待验证 | 仍需真实模型、线上运行或真实业务样本，不作为已完成结果 |

## 简历主张与证据

| 简历主张 | 公开证据 | 复现方式 | 证据等级与边界 |
| --- | --- | --- | --- |
| 通过村书记、村民共 12 人次的一线沟通，从多个乡村文旅候选方向中选择荔枝树认养作为优先验证链路 | [产品需求](../product/PRD.md)、[产品定位](../product/PRODUCT_POSITIONING.md) | 阅读问题、用户、旅程和非目标章节；面试时说明调研方法与方向取舍 | C；12 是沟通人次而非去重人数，名单和原始记录因隐私不公开 |
| 设计认养—养护履约—权益兑现—售后结算—续养复购闭环 | [产品需求](../product/PRD.md)、[实施报告](../reports/adoption-v2/implementation-report.md)、[工作流测试](../../apps/web/src/lib/adoption-workflow.test.ts) | `pnpm --filter @zouma/web test` | A；当前是前后台 Demo，不代表真实订单、支付或结算上线 |
| 高风险动作保留人工审核，AI 不直接修改订单与结算 | [Agent 报告](../reports/adoption-v2/agent-eval-report.md)、[Agent 测试](../../apps/web/src/lib/adoption-agent.test.ts) | `pnpm --filter @zouma/web test` | A；Agent 是影子模式，只读并生成建议 |
| 5 个固定种子 × 8 个场景的 V0/V1 成对模拟 | [模拟方法](../simulation/methodology.md)、[系统设计](../simulation/system-design.md)、[回归测试](../../packages/simulation/src/simulation.test.ts) | `pnpm simulation:regression --output outputs/simulation/regression-summary.json` | A；模拟运营数据，不代表真实业务结果 |
| 40 组结果均暂不支持升级 | [40 组回归结论](../simulation/resume-analysis.md)、[升级门槛](../simulation/metrics-definition.md) | 运行固定回归后核对每对 `worldHash`、指标和推荐结论 | B；结果用于发现规则缺口，不能外推真实效率或收益 |
| 固定知识评测中可回答问题召回 20/20、运营专属内容泄漏为 0 | [RAG 评测报告](../reports/adoption-v2/rag-eval-report.md)、[知识测试](../../packages/knowledge/src/knowledge.test.ts) | `pnpm --filter @zouma/knowledge test` | A；回答忠实度、引用准确率和综合拒答准确率仍待真实模型评测 |
| 履约协调 Agent 未达到上线门槛 | [Agent 影子模式报告](../reports/adoption-v2/agent-eval-report.md) | `pnpm --filter @zouma/web test` | D；未产生足够真实模型建议，不计算采纳率或业务效果 |

## 指标口径

所有模拟指标都返回 `numerator`、`denominator`、`value`、`unit` 和 `definition`。完整定义见[规则模拟指标口径](../simulation/metrics-definition.md)。

| 公开数字 | 分子 | 分母或基准 | 来源 | 计算与限制 |
| --- | --- | --- | --- | --- |
| 12 人次一线沟通 | 村书记、村民沟通记录共 12 人次 | 不适用 | 本人调研记录与简历汇总 | 人次不等于去重人数；原始记录包含个人信息，不在公开仓库提供 |
| 5 × 8 = 40 组成对模拟 | 5 个固定种子 | 8 个固定场景 | 模拟配置与回归测试 | 每组包含同一世界下的 V0/V1，必须共享 `worldHash` |
| 13 项模拟指标 | 每个指标各自定义的事件或任务数 | 对应有效任务、权益、审核或异常集合 | `packages/simulation/src/metrics.ts` | 比例按分子、分母聚合；分母为 0 时不形成数值 |
| 20/20 检索召回 | 20 条命中支持文档的问题 | 20 条可回答问题 | 固定 24 题评测集 | 不等于回答忠实度或真实用户满意度 |
| 运营专属内容泄漏 0 | 村民检索结果中的运营专属章节数 | 固定越权测试 | 角色过滤测试 | 只验证当前固定语料与检索路径 |

## 规则模拟复现

```bash
pnpm install --frozen-lockfile
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
pnpm simulation:regression --output outputs/simulation/regression-summary.json
```

运行产物保存在 Git 忽略目录，不作为公开附件。公开仓库只提交复核后的指标定义、方法、结论和测试。

> **模拟运营数据，不代表真实业务结果。** 模拟不能证明真实用户行为、村民效率、运营收益或因果效果。
