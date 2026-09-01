# 项目证据索引

本页只汇总当前仓库可以复现的 Demo、规则模拟和自动化检查。代码、测试和最新报告是仓库事实的最终依据。

## 当前项目是什么

“认养一棵树”围绕乡村果树认养和认养后的持续记录设计。三类演示角色共用统一认养 ID：

- 认养人查看树档案、养护记录、认养权益以及续养或售后状态；
- 村民养护人员领取养护任务，上传养护照片和说明；
- 运营人员分配任务、审核养护记录，并人工确认退款、判责和结算。

演示流程为：

```text
认养 → 养护任务 → 养护记录提交 → 人工审核 → 认养权益领取 → 售后或续养
```

当前只有前后台 Demo、规则模拟、固定种子测试以及产品流程和权限验证。没有真实订单、真实支付与结算、真实村民接单、实际运营收入，也没有经过验证的乡村增收或文旅效果。

## 可复现内容

| 可以核对的内容                                 | 证据                                                                                                               | 核对方式                                                                         | 边界                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| 认养、养护任务、养护记录、审核、权益和售后状态 | [功能状态与实现边界](../product/FEATURE_STATUS.md)、[工作流测试](../../apps/web/src/lib/adoption-workflow.test.ts) | `pnpm --filter @zouma/web test`                                                  | 仅验证 Demo 流程，不代表真实交易上线           |
| 退款、判责和结算保留人工确认                   | [Agent 测试](../../apps/web/src/lib/adoption-agent.test.ts)、[异常矩阵](../product/EXCEPTION_MATRIX.md)            | `pnpm --filter @zouma/web test`                                                  | AI 只整理信息或生成建议草稿                    |
| 5 个固定种子和 8 类场景的 V0/V1 成对模拟       | [模拟方法](../simulation/methodology.md)、[回归测试](../../packages/simulation/src/simulation.test.ts)             | `pnpm simulation:regression --output outputs/simulation/regression-summary.json` | 模拟结果不能外推真实效率、收入或影响           |
| 本地知识检索、角色过滤和引用检查               | [知识包说明](../../packages/knowledge/README.md)、[知识测试](../../packages/knowledge/src/knowledge.test.ts)       | `pnpm --filter @zouma/knowledge test`                                            | 固定语料检查不等于真实用户满意度或完整生成质量 |
| 前后台类型、测试、文档和构建门禁               | [根目录脚本](../../package.json)                                                                                   | `pnpm quality:gate`                                                              | 只说明当前代码通过对应检查                     |

> **模拟运营数据，不代表真实业务结果。**

## AI 使用边界

AI 可以整理养护说明、检查材料是否完整、生成审核意见草稿，以及根据演示数据整理运营建议。输出必须由使用者或运营人员确认。

AI 不会自动审核养护记录，不会自动判责、退款或完成结算，也不能绕过人工确认修改高风险状态。

## 运行与演示

安装依赖并启动项目：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

启动后可打开：

- 用户端：`http://localhost:3000/zh-CN`
- 运营后台：`http://localhost:3001`
- 流程演示：`http://localhost:3000/zh-CN/demo`

运行固定规则模拟：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
```

## 文档说明

- [功能状态与实现边界](../product/FEATURE_STATUS.md)用于区分已实现、部分实现和未实现功能。
- [规则模拟方法](../simulation/methodology.md)说明固定输入、指标和复现方式。
- [技术架构](../../ARCHITECTURE.md)说明应用与包之间的关系。
- [文档中心](../README.md)包含早期方案、设计记录和实施报告；这些材料可能记录当时的假设或规划，不应视为当前已上线功能或真实运营结果。

任何涉及用户量、交易额、收入、转化率、村民增收或社会影响的结论，都需要真实试点和可核验数据。当前仓库不提供这些结果。
