# Codex 修复指令

> **日期**: 2026-06-30
> **范围**: 仅 4 项修复，不涉及功能变更
> **原则**: 最小改动、不改业务逻辑

---

## ⚠️ 注意事项

1. 每项修复单独 commit，格式 `fix: <描述>`
2. 修复后运行 `pnpm lint` + `pnpm type-check` 确认无报错
3. 不改动任何 API 逻辑、数据模型、UI 交互

---

## Fix 1: 统一 `fetchWithTimeout` 到共享包

> 当前存在两份相同实现：`apps/web/src/lib/fetch-timeout.ts` 和 `apps/admin/src/lib/admin-api.ts`

**步骤 1**: 在 `packages/utils/src/` 新建 `fetch-timeout.ts`：

```ts
export async function fetchWithTimeout(
  url: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**步骤 2**: 在 `packages/utils/src/index.ts` 中导出：

```ts
export { fetchWithTimeout } from "./fetch-timeout"
```

**步骤 3**: 修改 `apps/web/src/lib/fetch-timeout.ts`，改为 re-export：

```ts
export { fetchWithTimeout } from "@zouma/utils/fetch-timeout"
```

> ⚠️ 检查 `apps/web/src/lib/aigc-api.ts` 也有 `export { fetchWithTimeout } from "@web/lib/fetch-timeout"`，不影响——它会自动跟随新路径。

**步骤 4**: 修改 `apps/admin/src/lib/admin-api.ts`，删除内联实现，改为：

```ts
import { fetchWithTimeout } from "@zouma/utils/fetch-timeout"
```

> ⚠️ `admin-api.ts` 中 `fetchWithTimeout` 的参数类型是 `url: string`，共享版是 `url: RequestInfo | URL`（更宽泛），兼容。无需改动 admin 调用方。

**步骤 5**: 确认 `apps/admin/tsconfig.json` 中 `transpilePackages` 或 Next.js 配置已包含 `@zouma/utils`。检查 `apps/admin/next.config.mjs` 是否已有：

```js
transpilePackages: ["@zouma/contracts", "@zouma/database", "@zouma/prompts", "@zouma/ui", "@zouma/utils"],
```

若无则添加。

---

## Fix 2: Admin `global-error.tsx` 颜色改为 Tailwind 主题 token

**文件**: `apps/admin/src/app/global-error.tsx`

当前使用硬编码颜色（`bg-[#ece5d8]`、`text-[#19201b]`、`border-[#cfc4b1]`）。

修改为项目 Tailwind 主题色类名：

| 当前 | 改为 |
|------|------|
| `bg-[#ece5d8]` | `bg-rice` |
| `text-[#19201b]` | `text-ink` |
| `border-[#cfc4b1]` | `border-line` |
| `text-[#19201b]/60` | `text-ink/60` |
| `bg-[#19201b]` | `bg-ink` |

修改后 `<main>` 元素：

```tsx
<main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
  <div className="max-w-md rounded-lg border border-line bg-white p-6 text-center shadow">
    <h1 className="text-xl font-semibold">运营后台暂时不可用</h1>
    <p className="mt-3 text-sm leading-6 text-ink/60">
      系统布局加载失败。请刷新页面重试，或联系技术支持确认后台服务状态。
    </p>
    <button
      className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
      onClick={reset}
      type="button"
    >
      刷新页面
    </button>
  </div>
</main>
```

> ⚠️ global-error 是独立于 layout 的错误边界，Tailwind 是否在此生效取决于 `tailwind.config.ts` 的 `content` 配置。如果 `apps/admin/tailwind.config.ts` 的 content 已包含 `./src/**/*.{ts,tsx}`（默认配置），则 Tailwind 类名可以正常工作。若担心，可先验证 `pnpm build` 不报错。

---

## Fix 3: Admin 页面中混合使用 `fetchAdminApi` 和 `fetchWithTimeout` 的统一

> 部分 admin 页面同时导入 `fetchAdminApi`（已内置超时和 token）和 `fetchWithTimeout`，用于不同类型的请求。当前功能正常，但风格不一致。

**检查范围**: 以下文件同时导入了两者：

- `apps/admin/src/app/(assets-commerce)/products/page.tsx`
- `apps/admin/src/app/(assets-commerce)/trees/page.tsx`
- `apps/admin/src/app/(assets-commerce)/activities/page.tsx`
- `apps/admin/src/app/(command)/reports/page.tsx`
- `apps/admin/src/app/(ai-system)/infrastructure/page.tsx`

**修复方式**: 对于不需要 `X-Admin-Token` 头的简单 GET 请求，可使用 `fetchWithTimeout`（当前已如此）。对于需要 token 的请求，使用 `fetchAdminApi`。当前用法合理，**仅需确认**：

- 用 `fetchWithTimeout` 发起的请求确实是无需 token 的公开端点
- 若不确定，统一改用 `fetchAdminApi`（它也能发 GET 请求且自动带 token，服务端会忽略多余的 header）

> 此项为可选修复，不改也不影响功能。

---

## Fix 4: 验证 `apps/admin/next.config.mjs` 的 transpilePackages

**文件**: `apps/admin/next.config.mjs`

确认是否包含 `@zouma/utils`，Fix 1 需要此项：

```js
const nextConfig = {
  transpilePackages: [
    "@zouma/contracts",
    "@zouma/database",
    "@zouma/prompts",
    "@zouma/ui",
    "@zouma/utils",
  ],
}
```

若已有则跳过，若缺失则添加。

---

## 执行顺序

```
Fix 4 (确认 transpilePackages)
  └─→ Fix 1 (统一 fetchWithTimeout)
        └─→ Fix 2 (global-error 颜色)
              └─→ Fix 3 (可选，统一 admin 请求风格)

全部完成后: pnpm lint && pnpm type-check && pnpm build
```
