# 走马村 AIGC 云脑 P5 — Codex 注意事项

> ⚠️ **必读**：本文档包含 P5 修复指令（`CODEX_P5_SECURITY_FIX.md`）中**容易出错的地方**和**需要根据实际代码调整的要点**。执行每个子任务前，先阅读对应章节。

---

## P5.0：OTP 安全修复

### P5.0.1 — 游客端 request-sms（风险：低）

- **改动行号准确**：第 31 行确实是 `return jsonResponse(request, { success: true, code })`
- **前端影响**：`auth-client.ts` 的调用方（`adoption-flow.tsx`、`booking-flow.tsx` 等）通过 `fetchWithAuth` 发送 SMS 验证，它们不从 response 中读取 `code`（都是调用 verify-sms 时由用户手动输入），所以去掉 `code` 字段**不会**破坏前端。
- **Dev 调试**：改后开发时无法在 Network 面板看到验证码。建议加 `if (process.env.NODE_ENV === "development") console.log("[DEV] OTP code:", code)` — 但绝不放在 response body 中。

### P5.0.2 — 村民端 request-otp（风险：低）

- **改动行号准确**：第 31 行确实是 `return jsonResponse(request, { success: true, message: "验证码已生成", otp })`
- **前端影响**：`villager-login-client.tsx` 调用 request-otp 后会让用户手动输入 OTP，不从 response 读取。安全。

### P5.0.3 — 村民端 verify-otp（风险：中）

- **关键时序**：`update` 必须用 `await`，放在 `findFirst` 通过之后、`return` 之前。如果放在 `return` 之后（fire-and-forget），攻击者可以在 update 完成前用同一 OTP 再发一个并发请求。
- **不需要在事务中**：`findFirst` + `update` 本身就足够 — 第二个并发 `findFirst` 会查到 `otpCode` 仍存在（第一个请求的 update 可能还没提交），但 otpExpiry 也还在有效期内，所以仍然会通过。不过此时两个请求都可能成功……正确做法是用 `$transaction` 包裹：

```typescript
const villager = await prisma.$transaction(async (tx) => {
  const found = await tx.villager.findFirst({
    where: { phone, otpCode: otp, otpExpiry: { gt: new Date() }, status: "active" },
  })
  if (!found) return null
  return tx.villager.update({
    where: { id: found.id },
    data: { otpCode: null, otpExpiry: null },
  })
})
if (!villager) {
  return jsonResponse(request, { error: "验证码无效或已过期" }, { status: 401 })
}
```

这样 `findFirst` + `update` 在同一事务中原子执行，第二个并发请求的 `findFirst` 会等待第一个事务提交后才能读到更新后的数据。

---

## P5.1：并发竞态修复

### P5.1.1 — 活动预订 FOR UPDATE（风险：高）

- **表名已确认**：CourtyardActivity 的 `@@map` 是 `"courtyard_activity"`（[schema.prisma:484](packages/database/prisma/schema.prisma#L484)），SQL 中表名正确。
- **`$executeRawUnsafe` 方法存在性确认**：Prisma 的 interactive transaction (`tx`) 支持 `$executeRawUnsafe`。如果报错 `tx.$executeRawUnsafe is not a function`，改用 `tx.$executeRaw` + 模板字符串：
  ```typescript
  await tx.$executeRaw`SELECT 1 FROM "courtyard_activity" WHERE "id" = ${activityId} FOR UPDATE`
  ```
  两种写法效果相同。用 `$executeRaw` 模板字符串更安全（自动参数化）。
- **FOR UPDATE 必须在事务内**：`SELECT ... FOR UPDATE` 只在事务内有效。当前代码已经用 `$transaction` 包裹，所以没问题。
- **不要锁多于必要的行**：`WHERE "id" = $1` 只锁一行，不会影响其他活动的并发预订。
- **PostgreSQL 隔离级别**：默认 `READ COMMITTED` 即可，`FOR UPDATE` 会等待其他事务释放锁。

### P5.1.2 — 采摘预约原子化（风险：高）

- **现有代码结构**：当前 POST handler 分三步：
  1. 第 42 行 `findFirst` 查 tree（**事务外**，不需要锁）
  2. 第 50 行 `findFirst` 查冲突（**需要进事务**）
  3. 第 63 行 `create`（**需要进事务**）

- **正确的事务边界**：只包裹步骤 2 和 3：
  ```typescript
  const tree = await prisma.orchardTree.findFirst({  // 事务外，只读
    where: { OR: [{ id: treeCode }, { treeCode }] },
  })
  if (!tree) return ...

  try {
    const record = await prisma.$transaction(async (tx) => {
      // 锁定树木行
      await tx.$executeRaw`SELECT 1 FROM "orchard_tree" WHERE "id" = ${tree.id} FOR UPDATE`

      // 检查时段冲突
      const conflict = await tx.harvestBooking.findFirst({
        where: {
          treeId: tree.id,
          scheduledDate,
          timeSlot,
          status: { in: ["pending", "confirmed"] },
        },
      })
      if (conflict) throw new Error("TIMESLOT_CONFLICT")

      // 创建预订
      return tx.harvestBooking.create({
        data: {
          treeId: tree.id,
          scheduledDate,
          timeSlot,
          guestCount,
          guestName: ...,
          guestPhone: maskPhone(...),
          fruitDestination: ...,
          destinationNote: ...,
          status: "pending",
        },
      })
    })
    return jsonResponse(request, { data: mapHarvestBooking(record) }, { status: 201 })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "BOOKING_FAILED"
    if (message === "TIMESLOT_CONFLICT") {
      return jsonResponse(request, { error: "Harvest slot already booked" }, { status: 409 })
    }
    throw caughtError  // 其他错误继续抛出 → 500
  }
  ```

- **表名已确认**：OrchardTree 的 `@@map` 是 `"orchard_tree"`（[schema.prisma:367](packages/database/prisma/schema.prisma#L367)）。

- **为什么锁 tree 而不是 harvestBooking**：因为冲突发生在同一棵树的同一时段。锁 tree 行意味着同一棵树的采摘预约串行化，这是业务语义正确的。

---

## P5.2：JWT / Admin Token 硬编码修复（风险：最高）

### ⚠️ P5.2 — 遗漏：`isAdminRequest` 也有硬编码回退

**我的修复指令遗漏了一个关键位置**：

[tree-records.ts:266-269](apps/web/src/lib/tree-records.ts#L266-L269)：
```typescript
export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_TOKEN ?? "dev-admin-token"  // ← 这里也有硬编码！
  return request.headers.get("x-admin-token") === expected
}
```

这个函数被所有已有认证的端点调用（harvest-bookings PATCH、recommendations POST、tree-adoptions 等）。如果只改了前端页面中的 `?? "dev-admin-token"`，不改这个函数，攻击者仍然可以用 `X-Admin-Token: dev-admin-token` 绕过认证。

**必须同时修改此处**：
```typescript
export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    console.error("ADMIN_API_TOKEN environment variable is not configured")
    return false  // 未配置时拒绝所有 admin 请求
  }
  return request.headers.get("x-admin-token") === expected
}
```

### P5.2.1 补充 — JWT Secret 的影响面

- `auth-jwt.ts` 的 `jwtSecret()` 被 `createJWT` 和 `verifyJWT` 调用。
- 改为抛异常后，如果 `JWT_SECRET` 未配置，**所有**使用 JWT 的 API（`auth/me`、`tree-adoptions` POST 等）会在首次调用时返回 500 而非静默使用不安全密钥。
- `.env.example` 中已有 `JWT_SECRET=` 占位，确保部署时填入真实值。

### P5.2.2 补充 — 前端 Admin Token 搜索清单

受影响的文件（每个都包含 `?? "dev-admin-token"`）：

| 文件 | 变量名 |
|------|--------|
| `apps/admin/src/app/activities/page.tsx` | `adminToken` |
| `apps/admin/src/app/devices/page.tsx` | `adminToken` |
| `apps/admin/src/app/farming/page.tsx` | `adminToken` |
| `apps/admin/src/app/harvest/page.tsx` | `adminToken` |
| `apps/admin/src/app/infrastructure/page.tsx` | `adminToken` |
| `apps/admin/src/app/products/page.tsx` | `adminToken` |
| `apps/admin/src/app/tasks/page.tsx` | `adminToken` |
| `apps/admin/src/app/trees/page.tsx` | `adminToken` |
| `apps/admin/src/app/villagers/page.tsx` | `adminToken` |
| `apps/admin/src/lib/admin-api.ts` | `fetchAdminApi` 内部 |
| **`apps/web/src/lib/tree-records.ts:267`** | **`isAdminRequest` 函数内部** |

搜索命令：
```bash
grep -rn "dev-admin-token" d:/1/AIGC/apps --include="*.ts" --include="*.tsx"
```

---

## P5.3：关键端点加认证（风险：最高）

### ⚠️ 核心问题：Admin 认证不是 JWT

**我的修复指令写错了！** `CODEX_P5_SECURITY_FIX.md` 中 P5.3.1 提议创建 `admin-guard.ts` 使用 JWT (`Authorization: Bearer ...`)，但实际 Admin 认证使用的是 `X-Admin-Token` header + `ADMIN_API_TOKEN` 环境变量（见 [tree-records.ts:266](apps/web/src/lib/tree-records.ts#L266)）。

**正确做法：不要新建 `admin-guard.ts`。直接复用现有的 `isAdminRequest(request)` 函数。**

### P5.3.2 修正版 — 正确的认证方式

| 端点 | 方法 | 正确的认证方式 |
|------|------|---------------|
| `alerts/route.ts` | PATCH | `isAdminRequest(request)` |
| `notifications/route.ts` | POST, PATCH | `isAdminRequest(request)` |
| `notifications/route.ts` | GET (游客查自己) | 游客 JWT（见下方说明） |
| `tree-adoptions/route.ts` | PATCH | `isAdminRequest(request)` |
| `infrastructure/decide/route.ts` | POST | `isAdminRequest(request)` |
| `reports/route.ts` | POST | `isAdminRequest(request)` |
| `ai/query/route.ts` | POST | 检查有效 JWT（`getBearerToken` + `verifyJWT`） |
| `ai/generate-content/route.ts` | POST | `isAdminRequest(request)` |
| `orders/route.ts` | POST | 检查有效 JWT（`getBearerToken` + `verifyJWT`） |
| `villagers/[id]/tasks/route.ts` | GET | 检查 villager token 或 `isAdminRequest` |

**插入代码模板**（Admin 端点）：
```typescript
import { isAdminRequest } from "@web/lib/tree-records"

// 在 handler 开头、body 解析之后插入：
if (!isAdminRequest(request)) {
  return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
}
```

**插入代码模板**（JWT 端点，如 `orders/route.ts`）：
```typescript
import { getBearerToken, verifyJWT } from "@web/lib/auth-jwt"

// 在 handler 开头插入：
const token = getBearerToken(request)
if (!token || !(await verifyJWT(token))) {
  return jsonResponse(request, { error: "Authentication required" }, { status: 401 })
}
```

### P5.3 — 通知端点的特殊处理

`NotificationBell` 组件（[notification-bell.tsx](apps/web/src/components/notification-bell.tsx)）只做 GET 查询，不做 POST。所以对 notifications 的 POST/PATCH 加 `isAdminRequest` 不会影响前端铃铛功能。

但 GET 也有问题：游客查询自己通知时用 `recipientId` 参数，这个参数可以随意修改来查看他人通知。建议在 GET 中，如果 query 包含 `recipientId` 且 `recipientType=tourist`，校验 Bearer token 中的 userId 经过 maskPhone 后是否匹配 `recipientId`。

**如果这步太复杂，可以先只对 POST/PATCH 加 admin 认证，GET 暂缓（记录为 P5.7.3 的技术债）。**

### P5.3 — 村民任务列表的 requireVillagerOrAdmin

`CODEX_P5_SECURITY_FIX.md` 提到了 `requireVillagerOrAdmin` 但没有给出实现。下面是完整实现：

```typescript
import { isAdminRequest } from "@web/lib/tree-records"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { jsonResponse } from "@web/lib/aigc-api"

async function requireVillagerOrAdmin(request: Request, villagerId: string) {
  // 1. 先检查 admin
  if (isAdminRequest(request)) return { authorized: true }

  // 2. 再检查 villager token
  const tokenVillagerId = getVillagerIdFromToken(request)
  if (tokenVillagerId === villagerId) return { authorized: true }

  // 3. 拒绝
  return {
    authorized: false,
    response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }),
  }
}
```

**如果觉得新增这个函数太复杂，简化为只检查 `isAdminRequest(request)` 也可接受。**

---

## P5.4：AI 端点频率限制

### P5.4.1 — Redis 连接处理（风险：中）

- `getRedis()` 返回的 Redis 实例在首次请求时可能尚未连接。`adoption-lock.ts` 中用了 `if (redis.status === "wait") await redis.connect()`，rate-limit.ts 应复用这个模式。
- `lazyConnect: true`（在 [redis.ts](packages/database/src/redis.ts) 中设置）意味着必须显式 `connect()` 或等第一次命令自动连接。`incr` 命令会自动触发连接，但不一定会等待连接完成。稳妥做法是加 `if (redis.status === "wait") await redis.connect()`。

### P5.4.2 — 固定窗口的边界问题（风险：低）

- 限流使用固定窗口（`Math.floor(now / windowSeconds)`），存在边界突发问题：用户在窗口末尾（如第 55 秒）发 5 个请求，然后在下一个窗口开头（如第 61 秒）又发 5 个，实际 6 秒内发了 10 个请求。
- 对于当前业务的 LLM 调用量，这个精度足够。如果后续需要更精确的限流，改用滑动窗口（sorted set）或 token bucket。

### P5.4.2 — 429 响应中 CORS headers（风险：中）

- 代码模板中使用了 `...getCorsHeaders(request)`，确保 `getCorsHeaders` 已从 `@web/lib/aigc-api` 导入。
- 如果 `getCorsHeaders` 不可用（它目前是 `feedback/route.ts` 中的本地函数），改用 `optionsResponse` 的模式硬编码 CORS headers。

---

## P5.5：文件上传安全加固

### P5.5.1 — Magic Number 校验的技术细节（风险：中）

- **WebP 校验不完整**：`RIFF` (52 49 46 46) 是 RIFF 容器格式的通用头，不只是 WebP。真正的 WebP 在偏移 8 处还有 `WEBP` (57 45 42 50) 标识。但加上 `file.type === "image/webp"` 的双重校验足够过滤恶意文件。
- **Next.js API Route 中 `File` 类型的 `arrayBuffer()`**：Next.js 的 `request.formData()` 返回的 `File` 确实有 `.arrayBuffer()` 方法。但建议加 try-catch 以防大文件或损坏文件导致异常。
- **两个文件都要改**：
  - `apps/web/src/app/api/v1/upload/route.ts`（Admin 上传）
  - `apps/web/src/app/api/v1/interactions/upload/route.ts`（游客互动上传）

### P5.5.1 补充 — 函数放置位置

`validateFileMagicNumber` 可以放在两个 route 文件中各自定义（代码量很小），或提取到 `apps/web/src/lib/upload-utils.ts` 共用。

---

## P5.6：cron daily-report 方法修正

### P5.6.1 — 外部 cron 调用方（风险：中）

- 检查是否有外部服务（Vercel Cron Jobs、GitHub Actions、cron-job.org 等）正在调用 `GET /api/v1/cron/daily-report`。如果是，需要同步更新调用方的 HTTP 方法。
- 在项目中搜索调用方：
  ```bash
  grep -rn "daily-report" d:/1/AIGC --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.yaml"
  ```

---

## P5.7：通知权限与村民任务修复

### P5.7.1 — 手机号格式校验（风险：低）

- 游客端用 `/^1[3-9]\d{9}$/`，村民端改为同样的正则。确保 i18n 错误消息在 zh-CN/en/ja 三语中都有对应翻译。如果在 route handler 中硬编码中文消息，目前项目已有很多先例，可以接受。

### P5.7.2 — 村民任务权限（风险：中）

- `getVillagerIdFromToken` 从 `X-Villager-Token` header 解析，**不查数据库**（只验证 token 格式和时效）。如果需要严格校验（如检查 villager 未被禁用），需要在 `requireVillagerOrAdmin` 中额外查 `prisma.villager.findUnique`。
- **简化方案**：如果 P5.3 改动量已很大，可以先只加 `isAdminRequest(request)` 到 `villagers/[id]/tasks/route.ts` 的 GET handler。将"村民查看自己任务"的认证延后到下一轮。

### P5.7.3 — 通知归属校验（风险：高，复杂度高）

- 游客通知的 `recipientId` 是 `userId`（有 JWT 时）或 `maskPhone(phone)`（无 JWT 时），见 `resolveTouristRecipientId`（[auth-client.ts:41-43](apps/web/src/lib/auth-client.ts#L41-L43)）。
- 如果要校验归属，逻辑如下：
  1. 从 Bearer token 提取 userId
  2. 查 `user.mobile`
  3. `maskPhone(user.mobile)` 与 query 中的 `recipientId` 比较
  4. 无 JWT 的游客（只存了 localStorage phone）无法通过此校验 — 这是预期行为，他们不应该能查询其他人的通知
- **如果这个校验太复杂，暂缓并记录为技术债。**

---

## P5.8：防 SSRF 加固

### ⚠️ P5.8.1 — 白名单不匹配（风险：高）

**我的修复指令中的白名单与代码不符！**

实际代码（[recommendation-generator.ts:14-19](apps/web/src/lib/recommendation-generator.ts#L14-L19)）：
```typescript
const allowedActionEndpoints = new Set([
  "/api/v1/scenes/promotion/active",
  "/api/v1/tasks",
  "/api/v1/notifications",
  "/api/v1/alerts",
])
```

修复指令中的白名单**错误地**包含了 `/api/v1/infrastructure/commands` 且**遗漏了** `/api/v1/scenes/promotion/active`。

**必须更新 `recommendation-generator.ts` 中的白名单，使用精确路径匹配 + 拒绝绝对 URL**：

```typescript
const allowedActionEndpoints = new Set([
  "/api/v1/scenes/promotion/active",
  "/api/v1/tasks",
  "/api/v1/notifications",
  "/api/v1/alerts",
])

export function isAllowedRecommendationEndpoint(endpoint: string): boolean {
  // 拒绝绝对 URL（防 SSRF）
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return false
  // 精确匹配（去掉 query string）
  const path = endpoint.split("?")[0]
  return allowedActionEndpoints.has(path)
}
```

### P5.8.1 — `executeActionTriggers` 的改动位置

实际函数在 [recommendations/[id]/approve/route.ts:129-161](apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts#L129-L161)。改动：
1. 删除第 142 行中的 `X-Admin-Token` 转发
2. 在第 138 行 fetch 调用外加 `AbortController` 超时

---

## P5.9：前端安全加固

### P5.9.1 — localStorage 确实存了明文手机号（风险：中）

[auth-client.ts:34-38](apps/web/src/lib/auth-client.ts#L34-L38)：
```typescript
export function rememberTouristIdentity(phone: string) {
  const normalizedPhone = phone.trim()
  window.localStorage.setItem("tourist_phone", normalizedPhone)  // ← 明文！
  ...
}
```

这是 `adoption-flow.tsx`、`booking-flow.tsx`、`ticket-flow.tsx` 三个流程在提交时调用的函数。**手机号明文存入 localStorage**。

**修复方案**：
- 方案 A：存储 `maskPhone(phone)`。但 `maskPhone` 是服务端函数（`"server-only"`），前端无法调用。
- 方案 B：前端自行脱敏（例如 `phone.slice(0, 3) + "****" + phone.slice(7)`），只在 `tourist_phone` key 中存脱敏版本。
- 方案 C：不存手机号到 localStorage，改用 JWT token 中的 userId 作为身份标识。游客每次需要输入手机号时从 token 中获取。

**推荐方案 B**（改动最小）。修改 `rememberTouristIdentity`：
```typescript
export function rememberTouristIdentity(phone: string) {
  const normalizedPhone = phone.trim()
  const masked = normalizedPhone.length >= 11
    ? normalizedPhone.slice(0, 3) + "****" + normalizedPhone.slice(7)
    : normalizedPhone
  window.localStorage.setItem("tourist_phone", masked)
  const token = getAuthToken()
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}
```

⚠️ 这个改动会导致 `NotificationBell` 中的 `resolveTouristRecipientId` 返回脱敏手机号，需要确认 `resolveTouristRecipientId` 的输出与后端通知的 `recipientId` 匹配。如果后端通知存储的 `recipientId` 是 `maskPhone` 的结果（通过 [notification-hooks.ts](apps/web/src/lib/notification-hooks.ts) 中的 `collectActiveAdopterPhones`），则匹配。需要验证。

**如果这个修复的连锁影响太大，先记录为技术债，延后处理。**

### P5.9.2 — dangerouslySetInnerHTML 检查

搜索命令：
```bash
grep -rn "dangerouslySetInnerHTML" d:/1/AIGC/apps --include="*.tsx"
```

如果结果为空，说明当前代码已使用 React 默认转义，XSS 风险低。

---

## P5.10：TypeScript 严格模式回归

### P5.10.1 — 已知的构建基线错误

根据 [docs/acceptance-criteria.md](docs/acceptance-criteria.md)，生产构建中存在已知的 `ReferenceError: window is not defined`（`/[locale]/routes` 段），这是本阶段外未修改的基线错误，**P5 不需要修复它**。

执行 `pnpm type-check` 后，只修复 P5 改动引入的新增 TS 错误。已有错误不改。

---

## 跨任务注意事项

### 1. `isAdminRequest` 的双重硬编码问题（影响 P5.2 + P5.3）

`isAdminRequest` 函数（[tree-records.ts:266](apps/web/src/lib/tree-records.ts#L266)）：
- P5.2 需要改它的硬编码回退
- P5.3 所有 admin 端点都用它做认证
- **执行顺序**：先完成 P5.2（修复 `isAdminRequest` 中的硬编码），再做 P5.3（给端点加 `isAdminRequest` 检查），否则 P5.3 加的检查仍然接受 `dev-admin-token`

### 2. 不要改 `fetchAdminApi`（admin-api.ts）

`fetchAdminApi` 已自动在非 GET/HEAD 请求上添加 `X-Admin-Token` header。P5.2.2 只需要改各页面的 `adminToken` 变量默认值。`fetchAdminApi` 本身不动。

### 3. P5.3 加认证后 — Admin 前端调用验证

给 API 加了 `isAdminRequest` 检查后，Admin 页面通过 `fetchAdminApi` 发起的请求会自动带 `X-Admin-Token`，但需要在 `.env.local` 中配置 `ADMIN_API_TOKEN`（服务端）和 `NEXT_PUBLIC_ADMIN_API_TOKEN`（客户端）为相同的值。

### 4. 并行执行的任务之间不应有文件冲突

可以并行执行的子任务组（它们的改动文件不重叠）：

| 并行组 | 子任务 | 涉及的改动文件 |
|--------|--------|---------------|
| A | P5.0 + P5.2 | auth/request-sms, villager-auth/request-otp, villager-auth/verify-otp, auth-jwt.ts, tree-records.ts, admin 页面 |
| B | P5.5 + P5.6 + P5.8 | upload/route.ts, interactions/upload/route.ts, cron/daily-report/route.ts, recommendations/approve/route.ts, recommendation-generator.ts |
| C | P5.4 | rate-limit.ts (新文件) + 6 个 AI 端点 |

P5.1 和 P5.3 各自独立，与其他任务文件不重叠。

### 5. 每个子任务单独 commit

```
P5.0: fix(auth): remove OTP from API responses, clear villager OTP after verification
P5.1: fix(concurrency): add FOR UPDATE locks to prevent overselling
P5.2: fix(security): remove hardcoded JWT secret and admin token fallbacks
P5.3: fix(auth): add authentication checks to unprotected write endpoints
P5.4: feat(rate-limit): add Redis-based rate limiting to AI endpoints
P5.5: fix(upload): add magic number validation for file uploads
P5.6: fix(cron): change daily-report endpoint from GET to POST
P5.7: fix(auth): add phone format validation and villager task authorization
P5.8: fix(security): harden recommendation action triggers against SSRF
P5.9: fix(security): mask phone number in localStorage, check XSS vectors
P5.10: chore: fix TypeScript errors introduced by P5 changes
```

---

## 快速验证清单（P5 全部完成后）

```bash
# 1. OTP 不再泄露
curl -s -X POST http://localhost:3000/api/v1/auth/request-sms \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13900001111"}' | grep -v "code"
# 预期：response 不含 "code" 字段（但含 "success": true）

# 2. 村民 OTP 一次性
# Step 1: 请求 OTP
curl -s -X POST http://localhost:3000/api/v1/villager-auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900001111"}'
# Step 2: 用返回的 OTP 验证两次
curl -s -X POST http://localhost:3000/api/v1/villager-auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900001111","otp":"123456"}'
# 第一次 → 200，第二次 → 401

# 3. Admin 端点认证
curl -s -X PATCH http://localhost:3000/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '{"id":"test","status":"resolved"}'
# 预期：401（无 X-Admin-Token）

# 4. AI 频率限制
for i in $(seq 1 12); do
  curl -s -X POST http://localhost:3000/api/v1/ai/query \
    -H "Content-Type: application/json" \
    -d '{"question":"测试"}'
done
# 预期：第 11-12 次返回 429

# 5. 文件上传 Magic Number
echo "not a jpeg" > /tmp/fake.jpg
curl -s -X POST http://localhost:3000/api/v1/upload \
  -H "X-Admin-Token: <token>" \
  -F "file=@/tmp/fake.jpg;type=image/jpeg"
# 预期：400 "文件内容与类型不匹配"

# 6. TypeScript 类型检查
cd d:/1/AIGC && pnpm type-check
# 预期：P5 改动不引入新错误

# 7. 前台回归（快速冒烟）
# 打开浏览器访问：
# - http://localhost:3000/zh-CN （首页）
# - http://localhost:3000/zh-CN/trees （认养页）
# - http://localhost:3000/zh-CN/booking （预约页）
# - http://localhost:3000/zh-CN/tickets （票务页）
# - http://localhost:3000/zh-CN/villager/login （村民登录）
# 预期：全部加载正常，无报错

# 8. Admin 回归
# - http://localhost:3001/dashboard
# - http://localhost:3001/alerts
# 预期：全部加载正常
```
