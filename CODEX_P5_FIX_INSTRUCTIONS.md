# P5 修复验证 — Codex 二次修复指令

> **从**：Claude Code 深度审查
> **日期**：2026-06-22
> **上游**：`CODEX_P5_SECURITY_FIX.md` + `CODEX_P5_ATTENTION_POINTS.md`

---

## 总览

P5 的 12 项安全修复**在后端 API 层面全部正确**。但**Admin 前端面板有 5 个回归**——P5 为 API 加了认证后，对应的 Admin 页面未同步发送 `X-Admin-Token`，导致这些功能返回 401。

---

## 🔴 CRITICAL：Admin 面板 P5 回归（5 个页面）

### 根因

P5.3 给 6 个此前无认证的 API 端点加了 `isAdminRequest(request)` 检查。但部分 Admin 前端页面使用原始 `fetch()` 且**未携带 `X-Admin-Token` header**，P5 后这些请求被拒绝。

### FIX-1：`alerts/page.tsx` — PATCH 告警状态失败

**文件**：`apps/admin/src/app/alerts/page.tsx`
**位置**：第 71-78 行 `updateStatus` 函数
**问题**：PATCH 请求缺少 `X-Admin-Token` header。后端 [alerts/route.ts:36](apps/web/src/app/api/v1/alerts/route.ts#L36) 现在要求 `isAdminRequest(request)`。

**当前代码**（第 72-76 行）：
```typescript
const response = await fetch(`${adminApiBase}/alerts`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id, status: nextStatus }),
})
```

**修复**：从 `@admin/lib/admin-api` 导入 `adminApiToken`，并在 headers 中加入 `X-Admin-Token`：

```typescript
import { adminApiBase, adminApiToken } from "@admin/lib/admin-api"
// ...
const response = await fetch(`${adminApiBase}/alerts`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "X-Admin-Token": adminApiToken },
  body: JSON.stringify({ id, status: nextStatus }),
})
```

---

### FIX-2：`reports/page.tsx` — POST 生成报告失败

**文件**：`apps/admin/src/app/reports/page.tsx`
**位置**：第 48-52 行 `generateReport` 函数
**问题**：POST 请求缺少 `X-Admin-Token`。后端 [reports/route.ts:39](apps/web/src/app/api/v1/reports/route.ts#L39) 现在要求 `isAdminRequest(request)`。

**当前代码**（第 48-52 行）：
```typescript
const response = await fetch(`${adminApiBase}/reports`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ date }),
})
```

**修复**：
```typescript
import { adminApiBase, adminApiToken } from "@admin/lib/admin-api"
// ...
const response = await fetch(`${adminApiBase}/reports`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Admin-Token": adminApiToken },
  body: JSON.stringify({ date }),
})
```

---

### FIX-3：`infrastructure/page.tsx` — POST 设施决策失败

**文件**：`apps/admin/src/app/infrastructure/page.tsx`
**位置**：第 73 行 `runDecision` 函数
**问题**：此页面**已声明** `adminToken`（第 37 行）并在 `updateCommand`（第 82 行）和 `submitManualReading`（第 92 行）中正确使用，但 `runDecision` 函数**遗漏了** `X-Admin-Token`。后端 [infrastructure/decide/route.ts:11](apps/web/src/app/api/v1/infrastructure/decide/route.ts#L11) 现在要求 `isAdminRequest(request)`。

**当前代码**（第 73 行）：
```typescript
const response = await fetch(`${adminApiBase}/infrastructure/decide`, { method: "POST" })
```

**修复**：
```typescript
const response = await fetch(`${adminApiBase}/infrastructure/decide`, {
  method: "POST",
  headers: { "X-Admin-Token": adminToken },
})
```

---

### FIX-4：`content-factory/page.tsx` — POST AI 内容生成失败

**文件**：`apps/admin/src/app/content-factory/page.tsx`
**位置**：第 31-35 行 `generateContent` 函数
**问题**：POST 请求缺少 `X-Admin-Token`。后端 [ai/generate-content/route.ts:15](apps/web/src/app/api/v1/ai/generate-content/route.ts#L15) 现在要求 `isAdminRequest(request)`。

**当前代码**（第 31-34 行）：
```typescript
const response = await fetch(`${adminApiBase}/ai/generate-content`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(form),
})
```

**修复**：
```typescript
import { adminApiBase, adminApiToken } from "@admin/lib/admin-api"
// ...
const response = await fetch(`${adminApiBase}/ai/generate-content`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Admin-Token": adminApiToken },
  body: JSON.stringify(form),
})
```

---

### FIX-5：`ai-assistant/page.tsx` — POST AI 问答失败

**文件**：`apps/admin/src/app/ai-assistant/page.tsx`
**位置**：第 29-33 行 `askQuestion` 函数
**问题**：P5 将 `ai/query` 的认证方式设为 JWT (`requireBearerAuth`)，但 Admin 面板没有用户 JWT。后端 [ai/query/route.ts:11](apps/web/src/app/api/v1/ai/query/route.ts#L11) 现在要求 Bearer token。

**修复方案**（推荐方案 A）—— 后端支持双认证：

修改 `apps/web/src/app/api/v1/ai/query/route.ts`，允许 Admin Token 或 JWT：

```typescript
import { isAdminRequest } from "@web/lib/tree-records"
import { requireBearerAuth } from "@web/lib/api-auth"

export async function POST(request: Request) {
  // Admin token 或 JWT，二选一
  const isAdmin = isAdminRequest(request)
  if (!isAdmin) {
    const auth = await requireBearerAuth(request)
    if (!auth.authorized) return auth.response
  }
  // ... 其余逻辑不变
}
```

然后修改 `apps/admin/src/app/ai-assistant/page.tsx`，在请求中发送 Admin Token：

```typescript
import { adminApiBase, adminApiToken } from "@admin/lib/admin-api"
// ...
const response = await fetch(`${adminApiBase}/ai/query`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Admin-Token": adminApiToken },
  body: JSON.stringify({ question: trimmed }),
})
```

---

## 🟡 MEDIUM：Admin 页面 fetch 模式统一

### 现状

Admin 代码库中存在三种不同的 API 调用模式：

| 模式 | 使用位置 | 是否发送 X-Admin-Token |
|------|---------|----------------------|
| `fetchAdminApi(path, init)` | dashboard, recommendations, recommendation-review-panel, active-alerts-panel | ✅ 自动 |
| 本地 `adminToken` + 原始 `fetch()` | activities, devices, farming, harvest, products, tasks, trees, villagers, infrastructure | ✅ 手动 |
| 原始 `fetch()` 无 token | alerts, reports, content-factory, ai-assistant, feedback-admin | ❌ |

### FIX-6：将 write 操作的原始 fetch 迁移到 fetchAdminApi

对以下 9 个已有本地 `adminToken` 的页面，将写操作（POST/PATCH/DELETE）的 `fetch()` 替换为 `fetchAdminApi()`：

| 文件 | 当前 | 改为 |
|------|------|------|
| `activities/page.tsx` | `fetch(\`.../activities\`, { method: "POST", headers: {..., "X-Admin-Token": adminToken} })` | `fetchAdminApi("/activities", { method: "POST", body: ... })` |
| `devices/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `farming/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `harvest/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `products/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `tasks/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `trees/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `villagers/page.tsx` | 同上模式 | `fetchAdminApi(...)` |
| `infrastructure/page.tsx` | 同上模式 | `fetchAdminApi(...)` |

**改动模板**（以 `activities/page.tsx` 为例）：

```diff
- import { adminApiBase } from "@admin/lib/admin-api"
+ import { adminApiBase, fetchAdminApi } from "@admin/lib/admin-api"

- const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? ""

  async function createActivity(...) {
-   const response = await fetch(`${adminApiBase}/activities`, {
-     method: "POST",
-     headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
-     body: JSON.stringify(body),
-   })
-   if (!response.ok) ...
-   const payload = await response.json()
+   const payload = await fetchAdminApi("/activities", {
+     method: "POST",
+     body: JSON.stringify(body),
+   })
  }
```

**注意事项**：
- `fetchAdminApi` 自动在非 GET/HEAD 请求上添加 `X-Admin-Token`
- `fetchAdminApi` 已处理 `Content-Type: application/json`
- `fetchAdminApi` 在非 2xx 响应时抛出异常（需调整错误处理逻辑）
- **只改写操作**（POST/PATCH/DELETE），GET 请求保持不变（不需要认证）
- 改完后删除页面顶部的 `const adminToken = ...` 声明

---

## 🔵 附加建议（非阻塞）

### SUGGESTION-1：notification-bell.tsx 401 处理

**文件**：`apps/web/src/components/notification-bell.tsx`
**位置**：第 27-28 行 `refresh` 函数

当用户 JWT 过期时，通知轮询返回 401，但代码仅做 `if (!response.ok) return`，不清除过期 token。建议：

```typescript
async function refresh(effectiveId: string) {
  const response = await fetchWithAuth(`/api/v1/notifications?...`)
  if (response.status === 401) {
    clearAuthToken()
    return
  }
  if (!response.ok || cancelled) return
  // ...
}
```

---

## 验证清单（修复后执行）

```bash
# 1. TypeScript 编译
npx tsc --noEmit --project apps/admin/tsconfig.json
npx tsc --noEmit --project apps/web/tsconfig.json

# 2. 确认无残留的 dev-admin-token
grep -rn "dev-admin-token" d:/1/AIGC/apps --include="*.ts" --include="*.tsx"
# 预期：空

# 3. Admin 面板功能回归（手动）
# - http://localhost:3001/alerts → 点击"确认"/"解决"按钮 → 200（非 401）
# - http://localhost:3001/reports → 点击"生成日报" → 200（非 401）
# - http://localhost:3001/infrastructure → 点击"执行决策" → 200（非 401）
# - http://localhost:3001/content-factory → 点击"生成内容" → 200（非 401）
# - http://localhost:3001/ai-assistant → 输入问题并发送 → 200（非 401）

# 4. 前台通知铃铛（手动）
# - 未登录时访问首页 → 铃铛不报错，不显示异常未读数
# - 登录后 → 铃铛正常显示未读数

# 5. 确认所有 admin 页面加载正常
# - http://localhost:3001/dashboard
# - http://localhost:3001/activities
# - http://localhost:3001/trees
# - http://localhost:3001/products
# - http://localhost:3001/orders
# - http://localhost:3001/harvest
# - http://localhost:3001/villagers
# - http://localhost:3001/tasks
# - http://localhost:3001/devices
# - http://localhost:3001/farming
# - http://localhost:3001/nodes
# - http://localhost:3001/map
```

---

## 执行顺序

```
FIX-1 (alerts)     ─┐
FIX-2 (reports)     ├── 并行，每个 ~5 分钟
FIX-3 (infra)       │
FIX-4 (content-fac) ─┘

FIX-5 (ai-assistant) ── 需要同时改前后端，~15 分钟

FIX-6 (fetchAdminApi 迁移) ── 最后执行，~30 分钟（9 个文件）
```

**预估总时间**：约 1-1.5 小时。
