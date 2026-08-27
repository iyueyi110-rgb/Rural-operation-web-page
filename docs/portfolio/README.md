# 项目证据索引

本页连接项目背景、产品流程、版本决策、评测结果与可复现证据。代码、测试和最新报告是仓库事实的最终依据。

## 项目背景

认养项目常停留在一次性售卖：用户看不到后续养护和权益兑现，村民任务依赖分散记录，运营人员难以及时审核和处理异常。本项目以 `LZ-018` 为主案例，验证一条可追踪的认养履约闭环。

项目优先解决三类角色的协作问题：

- 认养用户：选树、查看成长、申请权益和续养或退款。
- 村民履约人员：接单、执行、提交凭证、响应退回和异常。
- 运营人员：分配任务、审核凭证、处理异常并控制结算门禁。

调研范围、证据边界与方向取舍见[调研证据与产品决策](../product/RESEARCH_AND_DECISIONS.md)。

## 产品流程

`选树 → 认养下单 → 生成任务 → 村民接单 → 上传凭证 → 运营审核 → 权益兑现 → 续养/退款申请`

完整需求、异常处理和指标设计见[产品需求](../product/PRD.md)、[认养履约异常矩阵](../product/EXCEPTION_MATRIX.md)和[指标树与真实试点方案](../product/METRICS_AND_PILOT.md)。所有功能的实现状态与演示边界见[功能状态与实现边界](../product/FEATURE_STATUS.md)。

## 真实证据

公开内容按以下等级区分证据强度，避免把演示、模拟或待验证假设写成真实业务结果。

| 等级 | 含义 |
| --- | --- |
| A：可重复 | 固定输入、实现代码、自动化测试和公开复现命令齐全 |
| B：公开报告 | 有指标口径、结果与边界，原始运行产物按仓库规则不提交 |
| C：私有材料 | 涉及访谈或个人信息，只公开方法和结论摘要 |
| D：待验证 | 仍需真实模型、线上运行或真实业务样本，不作为已完成结果 |

| 项目结论 | 公开证据 | 复现或核对方式 | 证据等级与边界 |
| --- | --- | --- | --- |
| 通过村书记、村民共 12 人次的一线沟通，从多个乡村文旅候选方向中选择荔枝树认养作为优先验证链路 | [调研证据与产品决策](../product/RESEARCH_AND_DECISIONS.md)、[产品需求](../product/PRD.md) | 阅读调研范围、假设、方向取舍与隐私边界 | C；12 是沟通人次而非去重人数，原始记录因隐私不公开，不新增虚构用户原话 |
| 设计认养—养护履约—权益兑现—售后结算—续养复购闭环 | [产品需求](../product/PRD.md)、[实施报告](../reports/adoption-v2/implementation-report.md)、[工作流测试](../../apps/web/src/lib/adoption-workflow.test.ts) | `pnpm --filter @zouma/web test` | A；当前是前后台 Demo，不代表真实订单、支付或结算上线 |
| 对凭证退回、任务超时、连续降雨、权益延迟和退款建立异常处理边界 | [认养履约异常矩阵](../product/EXCEPTION_MATRIX.md)、[API 合约](../reports/adoption-v2/api-contracts.md) | 对照异常触发、系统行为、人工门禁和指标口径 | A/B；部分场景为已实现行为，树木减产和死亡仍需真实试点验证 |
| 高风险动作保留人工审核，AI 不直接修改订单与结算 | [Agent 报告](../reports/adoption-v2/agent-eval-report.md)、[Agent 测试](../../apps/web/src/lib/adoption-agent.test.ts) | `pnpm --filter @zouma/web test` | A；Agent 是影子模式，只读并生成建议 |
| 5 个固定种子 × 8 个场景的 V0/V1 成对模拟 | [模拟方法](../simulation/methodology.md)、[系统设计](../simulation/system-design.md)、[回归测试](../../packages/simulation/src/simulation.test.ts) | `pnpm simulation:regression --output outputs/simulation/regression-summary.json` | A；模拟运营数据，不代表真实业务结果 |
| 40 组结果均暂不支持升级 | [回归测试](../../packages/simulation/src/simulation.test.ts)、[升级门槛](../simulation/metrics-definition.md) | 运行固定回归后核对每对 `worldHash`、指标和推荐结论 | B；结果用于发现规则缺口，不能外推真实效率或收益 |
| 建立认养履约指标树、代表性 Bad Case 和 10 至 20 棵树最小试点方案 | [指标树与真实试点方案](../product/METRICS_AND_PILOT.md)、[异常矩阵](../product/EXCEPTION_MATRIX.md) | 核对指标分子分母、事件链、暂停条件和证据类型 | B/D；模拟事件可复现，真实基线、目标和业务结果仍需试点建立 |
| 固定知识评测中可回答问题召回 20/20、运营专属内容泄漏为 0 | [RAG 评测报告](../reports/adoption-v2/rag-eval-report.md)、[知识测试](../../packages/knowledge/src/knowledge.test.ts) | `pnpm --filter @zouma/knowledge test` | A；回答忠实度、引用准确率和综合拒答准确率仍待真实模型评测 |
| 履约协调 Agent 未达到上线门槛 | [Agent 影子模式报告](../reports/adoption-v2/agent-eval-report.md) | `pnpm --filter @zouma/web test` | D；未产生足够真实模型建议，不计算采纳率或业务效果 |

## 版本决策

- MVP 从门票、住宿、研学、IoT 等候选方向收敛到一条认养履约链路。
- 退款、判责、结算和履约状态变更保留人工确认，Agent 仅生成影子建议。
- 在支付资质、回调、对账和退款责任链路完善前，不接入真实支付。
- V1 的过程指标虽有模拟改善，但公平性、验收率和容量护栏未全面改善，因此暂不升级。

决策依据和后续验证动作见[调研证据与产品决策](../product/RESEARCH_AND_DECISIONS.md)。

## 评测结果

所有模拟指标都返回 `numerator`、`denominator`、`value`、`unit` 和 `definition`。完整定义见[规则模拟指标口径](../simulation/metrics-definition.md)。

| 公开数字 | 分子 | 分母或基准 | 来源 | 计算与限制 |
| --- | --- | --- | --- | --- |
| 12 人次一线沟通 | 村书记、村民沟通记录共 12 人次 | 不适用 | 本人调研记录与公开结论摘要 | 人次不等于去重人数；原始记录包含个人信息，不在公开仓库提供 |
| 5 × 8 = 40 组成对模拟 | 5 个固定种子 | 8 个固定场景 | 模拟配置与回归测试 | 每组包含同一世界下的 V0/V1，必须共享 `worldHash` |
| 13 项模拟指标 | 每个指标各自定义的事件或任务数 | 对应有效任务、权益、审核或异常集合 | `packages/simulation/src/metrics.ts` | 比例按分子、分母聚合；分母为 0 时不形成数值 |
| 20/20 检索召回 | 20 条命中支持文档的问题 | 20 条可回答问题 | 固定 24 题评测集 | 不等于回答忠实度或真实用户满意度 |
| 运营专属内容泄漏 0 | 村民检索结果中的运营专属章节数 | 固定越权测试 | 角色过滤测试 | 只验证当前固定语料与检索路径 |

规则模拟复现：

```bash
pnpm install --frozen-lockfile
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
pnpm simulation:regression --output outputs/simulation/regression-summary.json
```

运行产物保存在 Git 忽略目录，不作为公开附件。公开仓库只提交复核后的指标定义、方法、结论和测试。

> **模拟运营数据，不代表真实业务结果。** 模拟不能证明真实用户行为、村民效率、运营收益或因果效果。

## 本人与 AI 的分工

| 环节 | 本人负责 | AI 协助 | 本人如何验收与决策 |
| --- | --- | --- | --- |
| 问题定义 | 实地沟通、场景判断、候选方向比较、确定认养链路和角色优先级 | 整理访谈摘要、备选假设和问题清单 | 核对真实样本与业务边界，决定保留或否决假设 |
| 业务规则 | 定义角色、状态、异常、人工审核节点和升级门槛 | 生成初版流程文档、状态实现和测试草稿 | 用异常案例与状态机测试复核，不允许 AI 直接决定退款、结算或状态变更 |
| 原型与代码 | 定义交互要求、验收标准和版本取舍 | 搭建页面、接口、测试与重构代码 | 本地运行、复现 Bad Case、检查安全边界并决定是否合并 |
| 数据结论 | 定义指标分子分母、排除条件、护栏和升级标准 | 执行固定种子模拟、聚合结果和生成报告草稿 | 核对口径、抽样记录和反证，最终决定暂缓升级 |

## Demo 和核心文档

运行项目后打开 `http://localhost:3000/zh-CN/demo`，按[3 分钟 Demo 演示脚本](DEMO_SCRIPT.md)查看 `LZ-018` 主流程。方案定价、成本和责任关系见[商业与运营模型](../product/BUSINESS_AND_OPERATIONS.md)。

- [产品需求](../product/PRD.md)
- [调研证据与产品决策](../product/RESEARCH_AND_DECISIONS.md)
- [功能状态与实现边界](../product/FEATURE_STATUS.md)
- [指标树与真实试点方案](../product/METRICS_AND_PILOT.md)
- [规则模拟测评方法](../simulation/methodology.md)
- [技术架构](../../ARCHITECTURE.md)
- [文档中心](../README.md)

当前未接入真实认养订单和真实支付，未验证真实村民履约效率或运营收益，也未完成依赖真实模型输出的全部评测。线上 Demo 只有在多网络环境验活后才会作为稳定入口。
