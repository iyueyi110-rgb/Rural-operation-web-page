# @zouma/contracts

Web、Admin 和共享包之间的 TypeScript 领域合约。内容覆盖场景、订单、认养履约、村民任务、知识回答、模拟系统、设施控制和空间改造。

```ts
import type {
  KnowledgeAnswerData,
  SimulationRun,
  TreeAdoptionData,
} from "@zouma/contracts"
```

## Rules

- 合约是跨 workspace 边界，不放运行时副作用。
- 新字段优先向后兼容；破坏性变更必须同步所有消费者和测试。
- PII 字段只描述内部传输形状，不代表可以发送给外部模型。
- `DataOrigin` 和模拟 provenance 不能从模拟记录中删除。

```bash
pnpm --filter @zouma/contracts type-check
```
