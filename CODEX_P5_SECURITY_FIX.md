# 走马村 AIGC 云脑 P5 — Codex 安全修复执行指令

## 架构约束

- 在现有 `d:\1\AIGC` monorepo 中修改，不新建项目
- **只修不改逻辑**：所有修复为最小化改动，不重构业务逻辑
- `packages/utils` 保持无 DB 依赖
- P0/P1/P2/P3/P4 模型和 API 的**业务行为不变**

---

## P5 总体验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | OTP 不再从 API Response 返回 | `POST /api/v1/auth/request-sms` → response 不含 `code` 字段 |
| 2 | 村民 OTP 验证后立即失效 | 同一 OTP 第二次调用 verify-otp → 返回 401 |
| 3 | 活动预订不可超卖 | 并发 10 个 POST → 仅有 capacity 数量成功，其余 409 |
| 4 | 采摘预约不可冲突 | 同一时段并发 5 个 POST → 仅 1 个成功，其余 409 |
| 5 | JWT_SECRET 未配置时拒绝启动 | 删除 JWT_SECRET 环境变量 → 启动报错，不静默使用 dev key |
| 6 | Admin Token 未配置时拒绝启动 | 删除 ADMIN_API_TOKEN → 启动报错 |
| 7 | 写操作端点均有认证 | 所有 PATCH/POST/DELETE 端点 → 无 token 返回 401 |
| 8 | AI 端点有频率限制 | 短时间内连续 10 次 POST → 第 6+ 次返回 429 |
| 9 | 文件上传校验 Magic Number | 上传 .exe 伪装 .jpg → 返回 400 |
| 10 | cron daily-report 改用 POST | `GET /api/v1/cron/daily-report` → 返回 405 |
| 11 | 前台 web 所有现有功能不受影响 | 四境/路线/预订/认养/门票/反馈全部正常 |
| 12 | Admin 所有现有功能不受影响 | Dashboard/Nodes/Orders/Reports 等全部正常 |

---

## P5.0：OTP 安全修复（P0 — 最高优先级）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 0.1 | 游客 OTP 不再返回 | `POST /api/v1/auth/request-sms` response body 不含 `code` |
| 0.2 | 村民 OTP 不再返回 | `POST /api/v1/villager-auth/request-otp` response body 不含 `otp` |
| 0.3 | 村民 OTP 验证后清除 | 验证成功 → DB 中 `otpCode`/`otpExpiry` 置 null |
| 0.4 | 游客 OTP 不受影响 | 游客 OTP 验证后本就清除，回归确认不变 |

### P5.0.1：游客端 — 移除 OTP 明文返回

**文件**：`apps/web/src/app/api/v1/auth/request-sms/route.ts`

**改动**：第 31 行，将 `{ success: true, code }` 改为 `{ success: true, message: "验证码已发送" }`

```diff
- return jsonResponse(request, { success: true, code })
+ return jsonResponse(request, { success: true, message: "验证码已发送" })
```

**注意**：
- 不要改其他任何逻辑（upsert、OTP 生成、expiry 设置均不变）
- 若 `NODE_ENV === "development"`，可以在 console.log 输出 code 方便调试，但绝不能出现在 response body 中

---

### P5.0.2：村民端 — 移除 OTP 明文返回

**文件**：`apps/web/src/app/api/v1/villager-auth/request-otp/route.ts`

**改动**：第 31 行，将 `{ success: true, message: "验证码已生成", otp }` 改为不含 otp

```diff
- return jsonResponse(request, { success: true, message: "验证码已生成", otp })
+ return jsonResponse(request, { success: true, message: "验证码已发送" })
```

**注意**：
- 不要改其他逻辑（phone 查找、OTP 生成、update 均不变）
- 若 `NODE_ENV === "development"`，console.log 输出 otp 方便调试

---

### P5.0.3：村民端 — OTP 验证成功后立即清除

**文件**：`apps/web/src/app/api/v1/villager-auth/verify-otp/route.ts`

**问题**：`findFirst` 验证通过后直接返回，不清除 OTP。并发请求可同时通过验证。

**改动**：将 `findFirst` + `return` 改为 `$transaction` 包裹的 `findFirst` + `update`：

在第 22-29 行，将原代码：
```typescript
const villager = await prisma.villager.findFirst({
  where: { phone, otpCode: otp, otpExpiry: { gt: new Date() }, status: "active" },
})
if (!villager) {
  return jsonResponse(request, { error: "验证码无效或已过期" }, { status: 401 })
}
```

替换为：
```typescript
const villager = await prisma.$transaction(async (tx) => {
  const found = await tx.villager.findFirst({
    where: { phone, otpCode: otp, otpExpiry: { gt: new Date() }, status: "active" },
  })
  if (!found) return null

  // 原子性清除 OTP，防止并发重用
  return tx.villager.update({
    where: { id: found.id },
    data: { otpCode: null, otpExpiry: null },
  })
})

if (!villager) {
  return jsonResponse(request, { error: "验证码无效或已过期" }, { status: 401 })
}
```

然后在 return 中使用 `villager.id`、`villager.name` 等字段（与原代码中 `villager` 的字段名一致，无需改 return 部分）。

**注意**：
- `$transaction` 确保 `findFirst` + `update` 在同一事务中原子执行
- 第二个并发请求的 `findFirst` 会等待第一个事务提交后才能读到更新后的数据（`otpCode: null`） → 返回 401
- 如果 transaction 中的 update 失败，整个事务回滚，不会出现 OTP 被消费但 token 未返回的情况

---

## P5.1：并发竞态修复（P0）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1.1 | 活动预订不可超卖 | 并发 POST 超过 capacity → 仅 capacity 数量成功 |
| 1.2 | 采摘预约时段不冲突 | 同时段并发 POST → 仅 1 个成功 |
| 1.3 | 认养锁不变 | 认养接口的 Redis+乐观锁逻辑不动 |

### P5.1.1：活动预订 — 加 SELECT FOR UPDATE 悲观锁

**文件**：`apps/web/src/app/api/v1/activity-bookings/route.ts`

**问题**：事务内 `findUnique` → `aggregate` → `create`，两个并发请求可同时通过 capacity 检查。

**改动**：在事务内、`findUnique` 之前，先执行一条原生 SQL 对活动行加锁：

在 `prisma.$transaction(async (tx) => {` 之后，第 57 行之前，插入：

```typescript
// 悲观锁：锁定活动行，防止并发超卖
await tx.$executeRaw`SELECT 1 FROM "courtyard_activity" WHERE "id" = ${activityId} FOR UPDATE`
```

然后在原来的 `findUnique` 之后继续原有逻辑不变。

**完整改动后的事务结构**：
```
$transaction → $executeRaw(SELECT ... FOR UPDATE) → findUnique → aggregate → 检查容量 → create
```

**注意**：
- 使用 `$executeRaw` 模板字符串（自动参数化，比 `$executeRawUnsafe` 更安全）
- 表名已确认：CourtyardActivity 的 `@@map` 是 `"courtyard_activity"`（[schema.prisma:484](packages/database/prisma/schema.prisma#L484)）
- `FOR UPDATE` 只在事务内有效，当前代码已用 `$transaction` 包裹，无需额外改动
- 只锁一行（`WHERE "id" = ${activityId}`），不影响其他活动的并发预订
- 不要改动事务外的任何代码

---

### P5.1.2：采摘预约 — 加冲突检查的原子化

**文件**：`apps/web/src/app/api/v1/harvest-bookings/route.ts`

**问题**：第 50-57 行 `findFirst`（检查冲突）→ 第 63 行 `create`，不在同一事务中，并发可绕过冲突检查。

**注意**：第 42 行的树查找（`findFirst` 查 tree）是只读操作，不需要进事务。

**改动**：将冲突检查 + 创建包裹在 `$transaction` 中：

找到第 50-75 行的代码，替换为：

```typescript
  try {
    const record = await prisma.$transaction(async (tx) => {
      // 悲观锁：锁定树木行，防止并发时段冲突
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
          guestName: typeof body.guestName === "string" ? body.guestName.trim() : null,
          guestPhone: maskPhone(typeof body.guestPhone === "string" ? body.guestPhone : undefined),
          fruitDestination: typeof body.fruitDestination === "string" ? body.fruitDestination.trim() : null,
          destinationNote: typeof body.destinationNote === "string" ? body.destinationNote.trim() : null,
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
    throw caughtError
  }
```

**注意**：
- 表名已确认：OrchardTree 的 `@@map` 是 `"orchard_tree"`（[schema.prisma:367](packages/database/prisma/schema.prisma#L367)）
- 原来的 `const existing = ...` 检查和 `if (existing) return 409` 都移入事务内
- `tree` 对象在事务外已查到（第 42-48 行），`tree.id` 可用

---

## P5.2：JWT / Admin Token 硬编码修复（P0）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 2.1 | JWT_SECRET 未配置时拒绝启动 | 删除 env → API 返回 500，不静默使用 dev key |
| 2.2 | Admin Token 不硬编码回退 | 不配置 `ADMIN_API_TOKEN` → admin 请求返回 401 |
| 2.3 | `isAdminRequest` 不硬编码回退 | 不配置 → `isAdminRequest` 返回 false |

### P5.2.1：JWT Secret — 启动时校验

**文件**：`apps/web/src/lib/auth-jwt.ts`

**改动**：将 `jwtSecret()` 函数从静默回退改为启动时断言：

```typescript
function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return new TextEncoder().encode(secret)
}
```

**注意**：
- 这会在**运行时**首次调用 `createJWT` 或 `verifyJWT` 时抛出
- 生产构建时，Next.js 会在首次 API 请求时触发此错误 → 返回 500
- 这是一种最后防线，最优方案是在 CI/CD 构建阶段就检查环境变量

---

### P5.2.2：`isAdminRequest` 函数 — 移除服务端硬编码回退

**文件**：`apps/web/src/lib/tree-records.ts`

**改动**：第 267 行的 `isAdminRequest` 函数：

```diff
  export function isAdminRequest(request: Request) {
-   const expected = process.env.ADMIN_API_TOKEN ?? "dev-admin-token"
+   const expected = process.env.ADMIN_API_TOKEN
+   if (!expected) {
+     console.error("ADMIN_API_TOKEN environment variable is not configured")
+     return false
+   }
    return request.headers.get("x-admin-token") === expected
  }
```

**注意**：
- 这是**最关键**的一个改动。`isAdminRequest` 被所有已有认证的 API 端点调用
- 如果遗漏这个位置，即使改了前端页面中的硬编码，攻击者仍能用 `X-Admin-Token: dev-admin-token` 绕过所有 admin API 认证
- `return false` 意味着：不配 ADMIN_API_TOKEN 则所有 admin 操作被拒绝（安全优先）

---

### P5.2.3：Admin 前端页面 — 移除客户端硬编码回退

**搜索范围**：`apps/admin/src/app/**/*.tsx` 和 `apps/admin/src/lib/**/*.ts`

搜索命令：
```bash
grep -rn "dev-admin-token" d:/1/AIGC/apps --include="*.ts" --include="*.tsx"
```

**受影响的文件**（约 10 个）：

| 文件 | 改动 |
|------|------|
| `apps/admin/src/app/activities/page.tsx` | `?? "dev-admin-token"` → `?? ""` |
| `apps/admin/src/app/devices/page.tsx` | 同上 |
| `apps/admin/src/app/farming/page.tsx` | 同上 |
| `apps/admin/src/app/harvest/page.tsx` | 同上 |
| `apps/admin/src/app/infrastructure/page.tsx` | 同上 |
| `apps/admin/src/app/products/page.tsx` | 同上 |
| `apps/admin/src/app/tasks/page.tsx` | 同上 |
| `apps/admin/src/app/trees/page.tsx` | 同上 |
| `apps/admin/src/app/villagers/page.tsx` | 同上 |
| `apps/admin/src/lib/admin-api.ts` | `fetchAdminApi` 内部 |

**统一改动**：
```diff
- const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"
+ const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? ""
```

**注意**：
- `fetchAdminApi` (在 `admin-api.ts`) 已处理 token 为空时的 header 构建逻辑 — 不需要改动
- 环境变量名注意前端用 `NEXT_PUBLIC_ADMIN_API_TOKEN`，服务端用 `ADMIN_API_TOKEN` — 两者需配置为相同值

---

## P5.3：关键端点加认证（P1）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 3.1 | PATCH alerts 需要 admin token | 无 token PATCH → 401 |
| 3.2 | POST/PATCH notifications 需要认证 | 无 token → 401 |
| 3.3 | PATCH tree-adoptions 需要认证 | 无 token → 401 |
| 3.4 | POST infrastructure/decide 需要 admin token | 无 token → 401 |
| 3.5 | POST reports 需要 admin token | 无 token → 401 |
| 3.6 | POST ai/query 需要认证（JWT） | 无 token → 401 |
| 3.7 | POST ai/generate-content 需要 admin token | 无 token → 401 |
| 3.8 | POST orders 需要认证（JWT） | 无 token → 401 |
| 3.9 | GET villagers/[id]/tasks 需要认证 | 无 token → 401 |
| 3.10 | 已有认证的端点不受影响 | auth/me、villager/me 等正常 |

### P5.3.1：认证方式说明

⚠️ **重要**：本项目有两种认证体系，不要混淆：

| 认证体系 | Header | 校验方式 | 适用对象 |
|---------|--------|---------|---------|
| Admin | `X-Admin-Token` | `isAdminRequest(request)` | 运营后台 API |
| 游客 JWT | `Authorization: Bearer <jwt>` | `getBearerToken` + `verifyJWT` | 游客端 API |
| 村民 Token | `X-Villager-Token` | `getVillagerIdFromToken(request)` | 村民端 API |

**Admin 端点直接复用现有的 `isAdminRequest()` 函数。不需要新建文件。**

### P5.3.2：逐端点加认证

**Admin 端点**（使用 `isAdminRequest`）：

在 handler 函数中、body 解析之后、业务逻辑之前，插入：
```typescript
if (!isAdminRequest(request)) {
  return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
}
```

**JWT 端点**（使用 Bearer token）：

在 handler 函数开头插入：
```typescript
const token = getBearerToken(request)
if (!token || !(await verifyJWT(token))) {
  return jsonResponse(request, { error: "Authentication required" }, { status: 401 })
}
```

**改动清单**：

| 文件 | 方法 | 认证方式 | 导入 |
|------|------|---------|------|
| `api/v1/alerts/route.ts` | PATCH | `isAdminRequest` | 从 `tree-records` 导入 |
| `api/v1/notifications/route.ts` | POST, PATCH | `isAdminRequest` | 同上 |
| `api/v1/tree-adoptions/route.ts` | PATCH | `isAdminRequest` | 同上 |
| `api/v1/infrastructure/decide/route.ts` | POST | `isAdminRequest` | 同上 |
| `api/v1/reports/route.ts` | POST | `isAdminRequest` | 同上 |
| `api/v1/ai/query/route.ts` | POST | JWT (`getBearerToken`+`verifyJWT`) | 从 `auth-jwt` 导入 |
| `api/v1/ai/generate-content/route.ts` | POST | `isAdminRequest` | 从 `tree-records` 导入 |
| `api/v1/orders/route.ts` | POST | JWT (`getBearerToken`+`verifyJWT`) | 从 `auth-jwt` 导入 |
| `api/v1/villagers/[id]/tasks/route.ts` | GET | `isAdminRequest` 或村民 token | 见 P5.7.2 |

**参考已有实现**：`harvest-bookings/route.ts` 的 PATCH（第 80-83 行）已正确使用 `isAdminRequest`，照抄即可。

### P5.3.3：通知 GET 的归属校验（复杂度高，可延后）

通知 GET 查询允许通过 `recipientId` 参数查看他人通知。如需修复：
1. 检查请求是否携带有效 JWT
2. 从 JWT 提取 userId → 查 user.mobile → maskPhone → 与 query 中的 `recipientId` 对比
3. 不匹配则返回 401

**如果此步骤改动量太大，先只对 POST/PATCH 加 admin 认证，GET 暂缓。**

---

## P5.4：AI 端点频率限制（P1）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 4.1 | 同一 IP 1 分钟内最多 5 次 AI 调用 | 第 6 次返回 429 + Retry-After |
| 4.2 | Redis 不可用时降级放行 | Redis 挂了 → 不限流，记录 warn 日志 |
| 4.3 | 非 AI 端点不受影响 | 普通 GET/POST 不触发限流 |

### P5.4.1：创建限流工具

**新建文件**：`apps/web/src/lib/rate-limit.ts`

```typescript
import { getRedis } from "@zouma/database"

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`

  try {
    const redis = getRedis()
    if (redis.status === "wait") await redis.connect()

    const count = await redis.incr(windowKey)
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds)
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: (Math.floor(now / windowSeconds) + 1) * windowSeconds,
    }
  } catch {
    // Redis 不可用时降级放行
    console.warn("Rate limiter: Redis unavailable, allowing request")
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds }
  }
}

export function getRateLimitKey(request: Request, endpoint: string): string {
  // 优先用 IP，其次用 X-Forwarded-For
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  return `${endpoint}:${ip}`
}
```

### P5.4.2：在 AI 端点中应用限流

**改动文件清单**（每个文件在 POST 函数开头、body 解析之后，插入相同的限流检查块）：

| 文件 | 窗口 | 限额 |
|------|------|------|
| `api/v1/ai/query/route.ts` | 60s | 10 |
| `api/v1/ai/generate-content/route.ts` | 60s | 5 |
| `api/v1/routes/generate/route.ts` | 60s | 10 |
| `api/v1/reports/route.ts` | 300s | 3 |
| `api/v1/recommendations/generate/route.ts` | 300s | 5 |
| `api/v1/infrastructure/decide/route.ts` | 60s | 5 |

**插入代码模板**：

```typescript
// 频率限制
const rateLimitKey = getRateLimitKey(request, "ai-query") // 每个端点用不同标识
const rateLimit = await checkRateLimit(rateLimitKey, 10, 60)
if (!rateLimit.allowed) {
  return new Response(
    JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rateLimit.resetAt - Math.floor(Date.now() / 1000)),
        ...getCorsHeaders(request),
      },
    },
  )
}
```

---

## P5.5：文件上传安全加固（P2）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 5.1 | 校验文件 Magic Number | 上传 .exe 改 .jpg → 400 |
| 5.2 | 合法文件正常上传 | JPEG/PNG/WebP 上传 → 201 |

### P5.5.1：添加 Magic Number 校验

**文件**：`apps/web/src/app/api/v1/upload/route.ts` 和 `apps/web/src/app/api/v1/interactions/upload/route.ts`

**改动**：在文件类型白名单检查之后、文件写入之前，插入 Magic Number 校验：

```typescript
// Magic number 校验 — 防止 Content-Type 伪装
const MAGIC_NUMBERS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
}

async function validateFileMagicNumber(file: File): Promise<boolean> {
  const allowedMagic = MAGIC_NUMBERS[file.type]
  if (!allowedMagic) return false
  
  const buffer = new Uint8Array(await file.arrayBuffer().then((ab) => ab.slice(0, allowedMagic.length)))
  return allowedMagic.every((byte, index) => buffer[index] === byte)
}
```

在文件类型检查之后调用：
```typescript
const isValidMagic = await validateFileMagicNumber(file)
if (!isValidMagic) {
  return jsonResponse(request, { error: "文件内容与类型不匹配" }, { status: 400 })
}
```

**注意**：
- `file.arrayBuffer()` 只读取文件头几个字节，性能开销极小
- WebP 的 magic number 是 `RIFF` (52 49 46 46)，但文件头较长（需要进一步检查 `WEBP` 标识在偏移 8 处）— 简化起见先校验前 4 字节，再检查 `file.type === "image/webp"` 的联合判定

---

## P5.6：cron daily-report 方法修正（P2）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 6.1 | GET 返回 405 | `curl -X GET /api/v1/cron/daily-report?...` → 405 |
| 6.2 | POST 正常工作 | `curl -X POST ...` → 200/503 |

### P5.6.1：GET → POST

**文件**：`apps/web/src/app/api/v1/cron/daily-report/route.ts`

**改动**：
1. 将 `export async function GET` 改名为 `export async function POST`
2. 新增一个 GET handler 返回 405：

```typescript
export async function GET(request: Request) {
  return jsonResponse(request, { error: "Method Not Allowed" }, { status: 405 })
}
```

**注意**：
- `OPTIONS` handler 保持不变
- CRON_SECRET 校验逻辑完全不变
- 如果外部 cron 服务（如 Vercel Cron Jobs）只支持 GET，需要同时更新 cron 配置 — 但先改 API 再协调

---

## P5.7：通知权限与村民任务修复（P1）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 7.1 | 游客只能看自己的通知 | 用别人的 recipientId 查 → 401 |
| 7.2 | 村民任务列表仅本人可见 | 用别的 villagerId 查 → 401 |
| 7.3 | 村民 OTP 添加手机号格式校验 | 非法手机号 → 400 |

### P5.7.1：村民 OTP 请求 — 添加手机号格式校验

**文件**：`apps/web/src/app/api/v1/villager-auth/request-otp/route.ts`

**改动**：第 15-18 行，将简单的非空检查改为格式校验：

```diff
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
- if (!phone) {
-   return jsonResponse(request, { error: "phone is required" }, { status: 400 })
+ if (!/^1[3-9]\d{9}$/.test(phone)) {
+   return jsonResponse(request, { error: "有效的手机号是必填项" }, { status: 400 })
  }
```

### P5.7.2：村民任务列表 — 加认证

**文件**：`apps/web/src/app/api/v1/villagers/[id]/tasks/route.ts`

**改动**：GET handler 开头加认证检查。

**新建辅助函数**（放在同一文件中或提取到 `villager-auth.ts`）：

```typescript
import { isAdminRequest } from "@web/lib/tree-records"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { jsonResponse } from "@web/lib/aigc-api"

async function requireVillagerOrAdmin(request: Request, villagerId: string) {
  // 1. 先检查 admin token
  if (isAdminRequest(request)) return { authorized: true }

  // 2. 再检查 villager token 是否匹配 URL 中的 villagerId
  const tokenVillagerId = getVillagerIdFromToken(request)
  if (tokenVillagerId === villagerId) return { authorized: true }

  // 3. 拒绝
  return {
    authorized: false,
    response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }),
  }
}
```

**在 GET handler 中使用**：

```typescript
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const auth = await requireVillagerOrAdmin(request, id)
  if (!auth.authorized) return auth.response

  // 原有逻辑不变...
}
```

**简化方案**：如果新增函数工作量大，可简化为只检查 `isAdminRequest`：
```typescript
if (!isAdminRequest(request)) {
  return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
}
```

### P5.7.3：通知查询 — 加归属校验

**文件**：`apps/web/src/app/api/v1/notifications/route.ts`

**改动**：GET handler 中，当查询特定 `recipientId` 时，校验请求者身份：

如果是 `recipientType=tourist`，检查 `recipientId` 参数是否匹配当前 JWT 中的手机号（masked）。如果无有效 JWT，拒绝返回其他用户的通知。

**简化方案**：对于 tourist 类型的通知查询，要求请求携带有效的 Bearer token，从 token 中提取 userId → 查 user.mobile → maskPhone 后对比 recipientId。

---

## P5.8：防 SSRF 加固（P1）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 8.1 | 非白名单 endpoint 被拒绝 | actionStep 含 `http://evil.com` → 不执行 |
| 8.2 | 内部请求不转发 Admin Token | 触发请求的 Authorization header 不含 X-Admin-Token |

### P5.8.1：加固推荐审批的 trigger 执行

**文件 1**：`apps/web/src/lib/recommendation-generator.ts`（白名单所在位置）

**文件 2**：`apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts`（trigger 执行位置）

**改动 1** — 加固 `isAllowedRecommendationEndpoint` 白名单（`recommendation-generator.ts` 第 14-19 行）：

实际白名单为（不要改内容，只加安全检查）：
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
  // 拒绝包含路径穿越的 URL
  if (endpoint.includes("..")) return false
  // 精确匹配（去掉 query string）
  const path = endpoint.split("?")[0]
  return allowedActionEndpoints.has(path)
}
```

**改动 2** — `executeActionTriggers` 不转发 Admin Token（`approve/route.ts` 第 129-161 行）：

```diff
  async function executeActionTriggers(request: Request, triggers: ActionTrigger[]) {
-   const adminToken = request.headers.get("x-admin-token")
-
    return Promise.all(
      triggers.map(async (trigger) => {
        try {
          const response = await fetch(new URL(trigger.endpoint, request.url), {
            method: trigger.method,
            headers: {
              "Content-Type": "application/json",
-             ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
            },
            body: JSON.stringify(trigger.payload),
          })
```

**改动 3** — 添加 fetch 超时（5 秒）：

```typescript
async function executeActionTriggers(request: Request, triggers: ActionTrigger[]) {
  return Promise.all(
    triggers.map(async (trigger) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        const response = await fetch(new URL(trigger.endpoint, request.url), {
          method: trigger.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trigger.payload),
          signal: controller.signal,
        })
        return { endpoint: trigger.endpoint, ok: response.ok, status: response.status }
      } catch (error) {
        console.error("Recommendation action trigger failed", {
          recommendationId: request.url,
          endpoint: trigger.endpoint,
          error,
        })
        return { endpoint: trigger.endpoint, ok: false, status: 0 }
      } finally {
        clearTimeout(timeout)
      }
    }),
  )
}
```

---

## P5.9：前端安全加固（P2）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 9.1 | localStorage 不存明文手机号 | 检查 → 仅存 mask 后的值 |
| 9.2 | XSS 面缩小 | 反馈内容展示用 textContent 而非 innerHTML |

### P5.9.1：`rememberTouristIdentity` 存储脱敏手机号

**文件**：`apps/web/src/lib/auth-client.ts`

**问题**：第 35-36 行 `window.localStorage.setItem("tourist_phone", normalizedPhone)` 存储**明文手机号**。

**改动**：前端自行脱敏后再存储：

```diff
  export function rememberTouristIdentity(phone: string) {
    const normalizedPhone = phone.trim()
-   window.localStorage.setItem("tourist_phone", normalizedPhone)
+   const masked = normalizedPhone.length >= 11
+     ? normalizedPhone.slice(0, 3) + "****" + normalizedPhone.slice(7)
+     : normalizedPhone
+   window.localStorage.setItem("tourist_phone", masked)
    const token = getAuthToken()
    if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
```

⚠️ **连锁影响检查**：`NotificationBell` 通过 `resolveTouristRecipientId` 使用此值查询通知。需确认后端通知存储的 `recipientId` 与前端脱敏结果匹配。

- 有 JWT 时：`recipientId = userId`（不经过 maskPhone），不受影响 ✅
- 无 JWT 时：`recipientId = localStorage.tourist_phone`。如果后端通知的 `recipientId` 是 `maskPhone()` 结果，格式为 `139****1111`（掩码后），则需确保前端脱敏格式与 `maskPhone` 一致。**如果无法确认一致性，记录为技术债，仅在 `rememberTouristIdentity` 添加注释说明。**

**稳妥方案**（如连锁影响不确定）：
```typescript
// TODO: 改为存储脱敏手机号，需与后端 maskPhone 格式对齐
export function rememberTouristIdentity(phone: string) {
  const normalizedPhone = phone.trim()
  window.localStorage.setItem("tourist_phone", normalizedPhone)
  ...
}
```
不改变行为，但标记 TODO 待后续统一处理。

### P5.9.2：反馈内容安全渲染

**搜索范围**：`apps/admin/src/**/*.tsx` 中渲染 `record.content` 的地方

**确认**：使用 React 的默认转义（`{record.content}` 天然安全）而非 `dangerouslySetInnerHTML`。如果发现 `dangerouslySetInnerHTML`，改为纯文本渲染或先做 HTML 净化。

---

## P5.10：TypeScript 严格模式回归（P3）

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 10.1 | `npx tsc --noEmit` 零 error | 两个 app 均通过 |
| 10.2 | `npx eslint .` 零 error | 两个 app 均通过 |

### P5.10.1：类型检查

```bash
cd d:\1\AIGC
pnpm type-check
```

如有 error，逐个修复。常见问题：
- `catch(error)` 中 error 类型为 `unknown`
- `params` 异步未 await（Next.js 15 的 breaking change）
- 可能的 `null` 未处理

---

## 执行顺序

```
P5.0（OTP 安全）─┐
                ├── 并行，最快 15 分钟
P5.2（密钥硬编码）─┘

P5.1（并发竞态）── 依赖 P5.0/P5.2 完成，30 分钟

P5.3（端点认证）── 依赖 P5.2 的 admin-guard.ts，45 分钟

P5.4（频率限制）── 独立，30 分钟

P5.5（上传安全）─┐
P5.6（cron 方法）─┼── 并行，20 分钟
P5.7（通知权限）──┘

P5.8（SSRF 加固）── 独立，15 分钟

P5.9（前端安全）── 独立，15 分钟

P5.10（类型检查）── 最后执行，30 分钟
```

**总预估**：约 4-5 小时完成所有修复 + 验证。

---

## 回滚说明

所有改动均记录在 git 中。如需回滚单个子任务：

```bash
git log --oneline | grep "P5."  # 找到对应 commit
git revert <commit-hash>
```

每个子任务单独一个 commit，便于精准回滚。
