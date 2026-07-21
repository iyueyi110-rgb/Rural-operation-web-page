# @zouma/utils

跨应用的服务端工具和纯业务计算，包括超时 fetch、模型提供商适配、节点评分、设施控制建议、空间诊断和改造影响计算。

```ts
import {
  ModelProviderAdapter,
  computeScores,
  fetchWithTimeout,
} from "@zouma/utils"
```

## Boundaries

- 模型调用统一走 `ModelProviderAdapter`，由调用方先完成 PII 清洗。
- 纯计算函数保持确定性，不读取浏览器全局或隐式修改数据库。
- 网络工具必须有超时和可识别的失败结果。
- `server-only` 模块不得进入客户端 bundle。

```bash
pnpm --filter @zouma/utils test
pnpm --filter @zouma/utils type-check
```
