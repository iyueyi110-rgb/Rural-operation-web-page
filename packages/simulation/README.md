# @zouma/simulation

认养履约规则的确定性验证引擎。它在同一个不可变世界中运行 V0 与 V1，并输出可复现、可比较、可追溯的模拟证据。

> 模拟运营数据，不代表真实业务结果。

## Capabilities

- 5 个固定种子 × 8 个场景的 40 组成对回归。
- 13 项指标，保留 numerator、denominator、value、unit 和 definition。
- 事件链与 7 类 Bad Case，可定位规则退化原因。
- 11 类 JSON、CSV 和 Markdown 导出物。
- 相同输入产生相同 worldHash 和字节稳定世界。

## CLI

在仓库根运行：

```bash
pnpm simulation:run --seed 20260713 --scenario NORMAL --output outputs/simulation/pair.json
pnpm simulation:regression --output outputs/simulation/regression-summary.json
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json --output comparison.json
pnpm simulation:export --seed 20260713 --scenario NORMAL --output-root outputs/simulation
```

文件参数相对发起命令的工作目录解析；绝对路径保持不变。

## Package API

```ts
import {
  compareSimulationRuns,
  runSimulationPair,
} from "@zouma/simulation"

const pair = runSimulationPair({ seed: 20260713, scenario: "NORMAL" })
const comparison = compareSimulationRuns(pair.v0, pair.v1)

console.log(pair.v0.worldHash === pair.v1.worldHash)
console.log(comparison.recommendation)
```

公开入口还包括配置校验、确定性工具、世界生成、状态机、指标计算、事件队列和导出函数，准确列表见 `src/index.ts`。

## Failure behaviour

- 不支持的场景、越界规模和非法 seed 在运行前失败。
- 比较两个不同世界的运行会失败，不产生误导结论。
- 分母为零的比例指标返回 `null`，不伪装为 0%。
- 小样本或护栏退化会返回保守推荐。

## Verification

```bash
pnpm --filter @zouma/simulation test
pnpm --filter @zouma/simulation type-check
```

设计与口径见 [`docs/simulation/`](../../docs/simulation/system-design.md)。
