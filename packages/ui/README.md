# @zouma/ui

Web 与 Admin 共享的轻量 React/Next.js 组件层。

当前导出：`Section`、`StatusBadge`、`MasterDetailLayout`、`PageHeader`、`EmptyState`、`SafeImage`。

```tsx
import { EmptyState, PageHeader } from "@zouma/ui"
```

## Rules

- 组件保持业务无关，领域数据在应用层组装。
- 保留键盘访问、语义化标签、移动端布局和清晰的空/错/加载状态。
- 用户可见业务文案由调用方传入，不在共享包中写死。
- 图片使用 `SafeImage` 或 Next.js Image 的安全配置。

```bash
pnpm --filter @zouma/ui type-check
```
