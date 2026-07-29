# 管理后台访客访问实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 让匿名访客无需登录即可浏览管理后台并使用五个获批的生成能力，同时继续要求管理员会话保护其他写操作。

**架构：** 新建浏览器与服务端均可复用的访客权限策略，由 Middleware 提前拒绝越权请求、Admin BFF 执行最终鉴权。根布局只向客户端传递 `canWrite` 布尔值，页面据此禁用受保护控件；`ADMIN_API_TOKEN` 继续仅由 BFF 注入。

**技术栈：** Node.js 20+、pnpm 11.6.0、Turborepo、Next.js 14 Route Handlers 与 Middleware、React 18、TypeScript strict、Node Test Runner。

## 全局约束

- 使用 Node.js 20+ 和 `pnpm@11.6.0`。
- `apps/admin` 和 `apps/web` 均为 Next.js 14 应用，不新增独立服务。
- 不修改 Prisma Schema、迁移、Web API HTTP 合约或包级导出。
- 不提交 `.env.local`、`output/`、`outputs/`、缓存、本地数据库或模拟运行产物。
- 浏览器不得接触 `ADMIN_API_TOKEN`、`ADMIN_LOGIN_PASSWORD` 或 `ADMIN_SESSION_SECRET`。
- 匿名读取不屏蔽现有个人信息字段，这是已确认的产品范围。
- 五个访客生成能力继续使用现有 Web API 限流，超限时保持 `429` 响应。
- 模拟相关界面继续显示“模拟运营数据，不代表真实业务结果”。
- 本计划只修改和验证仓库代码，不执行生产部署或修改远端部署配置。
- 提交遵循 Conventional Commits，类型和作用域使用英文，主题使用中文。

---

## 文件结构

### 新建文件

- `apps/admin/src/lib/admin-guest-access.ts`：定义匿名允许的方法与五个精确 `POST` 路径。
- `apps/admin/src/components/admin-access.tsx`：提供 `canWrite` 上下文、统一登录提示和受保护控件属性。
- `apps/admin/src/lib/admin-access-ui-contract.test.ts`：验证布局、状态标识、访客能力与受保护控件契约。

### 修改文件

- `apps/admin/src/middleware.ts`：允许匿名页面和访客请求，提前拒绝其他匿名写请求。
- `apps/admin/src/lib/admin-bff.server.ts`：以共享策略作为最终服务端权限边界。
- `apps/admin/src/lib/admin-security.test.ts`：覆盖匿名读取、精确白名单、受保护写入、同源检查与管理员写入。
- `apps/admin/src/app/layout.tsx`：服务端验证 HttpOnly 会话并传递 `canWrite`。
- `apps/admin/src/app/admin-shell.tsx`：安装访问权限上下文。
- `apps/admin/src/components/admin-sidebar.tsx`：显示访客或管理员状态及登录入口。
- `apps/admin/src/lib/admin-copy.ts`：集中存放访客状态与登录提示文案。
- `apps/admin/src/components/active-alerts-panel.tsx`：保护确认告警并创建任务。
- `apps/admin/src/components/recommendation-review-panel.tsx`：保护建议审批。
- `apps/admin/src/app/feedback-admin.tsx`：保护反馈状态与处理备注。
- `apps/admin/src/app/(assets-commerce)/activities/page.tsx`：保护活动创建和状态修改。
- `apps/admin/src/app/(assets-commerce)/harvest/page.tsx`：保护预约确认和物流保存。
- `apps/admin/src/app/(assets-commerce)/products/page.tsx`：保护产品创建。
- `apps/admin/src/app/(assets-commerce)/trees/page.tsx`：保护树档案、养护记录和上传。
- `apps/admin/src/app/(ai-system)/ai-assistant/page.tsx`：保留匿名问答，保护转人工。
- `apps/admin/src/app/(ai-system)/devices/page.tsx`：保护设备新增。
- `apps/admin/src/app/(ai-system)/infrastructure/page.tsx`：保留匿名决策生成，保护手工读数和指令状态。
- `apps/admin/src/app/(command)/reports/page.tsx`：保护日报生成。
- `apps/admin/src/app/(field-ops)/alerts/page.tsx`：保护告警状态修改。
- `apps/admin/src/app/(village-work)/farming/page.tsx`：保护农事创建和修改。
- `apps/admin/src/app/(village-work)/tasks/page.tsx`：保护任务创建、修改和履约审核。
- `apps/admin/src/app/(village-work)/villagers/page.tsx`：保护村民创建和修改。
- `apps/admin/src/app/(village-work)/simulations/page.tsx`：向模拟写操作传递管理员权限。
- `apps/admin/src/components/simulation/runs-panel.tsx`：保护运行、复制和归档。
- `apps/admin/src/components/simulation/comparison-panel.tsx`：保护生成模拟对比。
- `apps/admin/src/components/simulation/bad-cases-panel.tsx`：保护复盘保存。
- `apps/admin/README.md`：记录访客权限和管理员权限。
- `ARCHITECTURE.md`：更新 Admin BFF 的混合访问模型。

---

### Task 1：建立服务端访客权限边界

**文件：**

- 新建：`apps/admin/src/lib/admin-guest-access.ts`
- 修改：`apps/admin/src/lib/admin-security.test.ts`
- 修改：`apps/admin/src/lib/admin-bff.server.ts`
- 修改：`apps/admin/src/middleware.ts`

**接口：**

- 产出：`isGuestAdminRequestAllowed(method: string, pathname: string): boolean`
- 使用者：`apps/admin/src/middleware.ts` 和 `apps/admin/src/lib/admin-bff.server.ts`
- 路径输入：Middleware 传 `/api/admin/...`；BFF 传由 catch-all 参数组成的 `/...`

- [ ] **步骤 1：先写匿名读取和精确白名单失败测试**

在 `admin-security.test.ts` 中把原“未认证 BFF 请求被拒绝”测试替换为匿名 `GET` 能成功代理，并新增表驱动的五路径 `POST` 测试：

```ts
const guestPostPaths = [
  ["knowledge", "query"],
  ["ai", "query"],
  ["ai", "generate-content"],
  ["renovation", "run-weekly"],
  ["infrastructure", "decide"],
] as const

test("anonymous Admin reads are proxied with the server token", async () => {
  let upstream: Request | undefined
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/orders?page=1"),
    ["orders"],
    {
      sessionSecret: "s".repeat(32),
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async (input, init) => {
        upstream = new Request(input, init)
        return Response.json({ data: [] })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(upstream?.headers.get("x-admin-token"), "web-service-token")
  assert.equal(upstream?.headers.has("cookie"), false)
})

test("anonymous visitors can call only the five approved POST capabilities", async () => {
  for (const pathSegments of guestPostPaths) {
    let upstreamCalls = 0
    const pathname = pathSegments.join("/")
    const response = await proxyAdminRequest(
      new Request(`http://admin.local/api/admin/${pathname}`, {
        method: "POST",
        headers: {
          origin: "http://admin.local",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      [...pathSegments],
      {
        sessionSecret: "s".repeat(32),
        webApiBase: "http://web.local/api/v1",
        adminApiToken: "web-service-token",
        fetcher: async () => {
          upstreamCalls += 1
          return Response.json({ data: {} })
        },
      },
    )

    assert.equal(response.status, 200, pathname)
    assert.equal(upstreamCalls, 1, pathname)
  }
})
```

新增匿名相似路径、普通写请求和页面中间件测试：

```ts
test("anonymous write paths outside the exact allowlist are rejected", async () => {
  for (const pathSegments of [
    ["ai", "query", "history"],
    ["knowledge", "escalations"],
    ["infrastructure", "commands"],
    ["simulations", "runs"],
  ]) {
    let upstreamCalls = 0
    const response = await proxyAdminRequest(
      new Request(
        `http://admin.local/api/admin/${pathSegments.join("/")}`,
        {
          method: "POST",
          headers: { origin: "http://admin.local" },
          body: "{}",
        },
      ),
      pathSegments,
      {
        sessionSecret: "s".repeat(32),
        webApiBase: "http://web.local/api/v1",
        adminApiToken: "web-service-token",
        fetcher: async () => {
          upstreamCalls += 1
          return new Response("unexpected")
        },
      },
    )

    assert.equal(response.status, 401, pathSegments.join("/"))
    assert.equal(upstreamCalls, 0, pathSegments.join("/"))
  }
})

test("middleware allows an anonymous Admin page", async () => {
  const response = await middleware(
    new NextRequest("http://admin.local/simulations"),
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.has("location"), false)
})
```

- [ ] **步骤 2：运行安全测试并确认按预期失败**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="anonymous|middleware allows"
```

预期：匿名 `GET` 和五个 `POST` 仍收到 `401`，页面中间件仍返回重定向，因此测试失败；失败原因必须是缺少访客权限，而不是语法或模块加载错误。

- [ ] **步骤 3：实现精确访客权限策略**

新建 `admin-guest-access.ts`：

```ts
const guestAdminPostPaths = new Set([
  "/knowledge/query",
  "/ai/query",
  "/ai/generate-content",
  "/renovation/run-weekly",
  "/infrastructure/decide",
])

function relativeAdminPath(pathname: string) {
  const adminPrefix = "/api/admin"
  return pathname.startsWith(`${adminPrefix}/`)
    ? pathname.slice(adminPrefix.length)
    : pathname
}

export function isGuestAdminRequestAllowed(
  method: string,
  pathname: string,
) {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") return true
  if (normalizedMethod !== "POST") return false
  return guestAdminPostPaths.has(relativeAdminPath(pathname))
}
```

修改 `proxyAdminRequest`，先计算访客权限，仅在非访客请求时验证会话：

```ts
const pathname = `/${path.join("/")}`
const guestAllowed = isGuestAdminRequestAllowed(request.method, pathname)
if (!guestAllowed) {
  const session = readCookie(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  )
  if (!(await verifyAdminSession(session, dependencies.sessionSecret))) {
    return jsonError("Unauthorized", 401)
  }
}
```

保留现有非 `GET/HEAD` 同源检查、配置检查、请求头净化、服务令牌注入和响应头过滤。

修改 Middleware：

```ts
export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  if (
    isGuestAdminRequestAllowed(
      request.method,
      request.nextUrl.pathname,
    )
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const authenticated = await verifyAdminSession(
    session,
    process.env.ADMIN_SESSION_SECRET ?? "",
  )
  return authenticated
    ? NextResponse.next()
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

保留 matcher 对登录、session Route Handler 和静态资源的排除。

- [ ] **步骤 4：补足同源与管理员写入回归测试**

在 `admin-security.test.ts` 新增：

```ts
test("anonymous approved POST capabilities still reject cross-origin requests", async () => {
  let upstreamCalls = 0
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/ai/query", {
      method: "POST",
      headers: { origin: "http://attacker.local" },
      body: "{}",
    }),
    ["ai", "query"],
    {
      sessionSecret: "s".repeat(32),
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async () => {
        upstreamCalls += 1
        return new Response("unexpected")
      },
    },
  )

  assert.equal(response.status, 403)
  assert.equal(upstreamCalls, 0)
})

test("authenticated administrators retain protected write access", async () => {
  const secret = "s".repeat(32)
  const session = await createAdminSession(secret)
  let upstreamCalls = 0
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/tasks", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${session}`,
        origin: "http://admin.local",
      },
      body: "{}",
    }),
    ["tasks"],
    {
      sessionSecret: secret,
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async () => {
        upstreamCalls += 1
        return Response.json({ data: {} })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(upstreamCalls, 1)
})
```

- [ ] **步骤 5：运行 Admin 安全测试并确认通过**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="anonymous|authenticated administrators|middleware allows"
pnpm --filter @zouma/admin type-check
```

预期：所选测试全部通过，TypeScript 无错误。

- [ ] **步骤 6：提交服务端权限边界**

```bash
git add apps/admin/src/lib/admin-guest-access.ts apps/admin/src/lib/admin-security.test.ts apps/admin/src/lib/admin-bff.server.ts apps/admin/src/middleware.ts
git commit -m "feat(admin): 开放访客读取与指定生成能力"
```

---

### Task 2：向界面提供可信的管理员状态

**文件：**

- 新建：`apps/admin/src/components/admin-access.tsx`
- 新建：`apps/admin/src/lib/admin-access-ui-contract.test.ts`
- 修改：`apps/admin/src/app/layout.tsx`
- 修改：`apps/admin/src/app/admin-shell.tsx`
- 修改：`apps/admin/src/components/admin-sidebar.tsx`
- 修改：`apps/admin/src/lib/admin-copy.ts`

**接口：**

- 产出：`AdminAccessProvider({ canWrite, children })`
- 产出：`useAdminAccess(): { canWrite: boolean }`
- 产出：`adminWriteControlProps(canWrite: boolean, disabled?: boolean): { disabled: boolean; title?: string }`
- 使用者：所有包含受保护写操作的客户端页面与组件

- [ ] **步骤 1：先写界面访问状态失败测试**

创建 `admin-access-ui-contract.test.ts`，用 `existsSync` 保证缺少新文件时表现为断言失败：

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(relativePath: string) {
  const url = new URL(relativePath, import.meta.url)
  return existsSync(url) ? readFileSync(url, "utf8") : ""
}

const accessSource = source("../components/admin-access.tsx")
const layoutSource = source("../app/layout.tsx")
const shellSource = source("../app/admin-shell.tsx")
const sidebarSource = source("../components/admin-sidebar.tsx")

test("the root layout derives only a boolean write capability from the HttpOnly session", () => {
  assert.match(layoutSource, /cookies\(\)/)
  assert.match(layoutSource, /verifyAdminSession/)
  assert.match(layoutSource, /<AdminShell canWrite=\{canWrite\}>/)
  assert.doesNotMatch(layoutSource, /ADMIN_API_TOKEN/)
})

test("the Admin shell provides guest access state to client components", () => {
  assert.match(accessSource, /createContext/)
  assert.match(accessSource, /AdminAccessProvider/)
  assert.match(accessSource, /useAdminAccess/)
  assert.match(accessSource, /adminWriteControlProps/)
  assert.match(shellSource, /<AdminAccessProvider canWrite=\{canWrite\}>/)
})

test("the sidebar distinguishes guest and administrator modes", () => {
  assert.match(sidebarSource, /访客模式/)
  assert.match(sidebarSource, /管理员模式/)
  assert.match(sidebarSource, /href="\/login"/)
})
```

- [ ] **步骤 2：运行契约测试并确认按预期失败**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="root layout|Admin shell|sidebar distinguishes"
```

预期：三项断言因布局尚未读取会话、Provider 不存在、侧边栏没有状态标识而失败。

- [ ] **步骤 3：实现访问上下文和统一控件属性**

创建 `admin-access.tsx`：

```tsx
"use client"

import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

export const ADMIN_WRITE_LOGIN_MESSAGE = "登录管理员后可操作"

const AdminAccessContext = createContext({ canWrite: false })

export function AdminAccessProvider({
  canWrite,
  children,
}: {
  canWrite: boolean
  children: ReactNode
}) {
  return (
    <AdminAccessContext.Provider value={{ canWrite }}>
      {children}
    </AdminAccessContext.Provider>
  )
}

export function useAdminAccess() {
  return useContext(AdminAccessContext)
}

export function adminWriteControlProps(
  canWrite: boolean,
  disabled = false,
) {
  return {
    disabled: disabled || !canWrite,
    ...(canWrite ? {} : { title: ADMIN_WRITE_LOGIN_MESSAGE }),
  }
}
```

- [ ] **步骤 4：在服务端根布局验证会话**

将 `RootLayout` 改为异步 Server Component：

```tsx
import { cookies } from "next/headers"

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@admin/lib/admin-session.server"

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = cookies().get(ADMIN_SESSION_COOKIE)?.value
  const canWrite = await verifyAdminSession(
    session,
    process.env.ADMIN_SESSION_SECRET ?? "",
  )

  return (
    <html lang="zh-CN">
      <body>
        {/* 保留现有 noscript 内容 */}
        <AdminShell canWrite={canWrite}>{children}</AdminShell>
      </body>
    </html>
  )
}
```

不得向 `AdminShell` 传递 session、secret 或 token。

- [ ] **步骤 5：安装 Provider 并显示访问状态**

将 `AdminShell` 签名改为：

```tsx
export function AdminShell({
  canWrite,
  children,
}: {
  canWrite: boolean
  children: ReactNode
}) {
  // 保留刷新逻辑
  return (
    <AdminAccessProvider canWrite={canWrite}>
      {/* 保留现有 Shell 布局 */}
    </AdminAccessProvider>
  )
}
```

在 `adminCopy.shell` 新增：

```ts
guestMode: "访客模式",
adminMode: "管理员模式",
adminLogin: "管理员登录",
writeLoginRequired: "登录管理员后可操作",
```

在 `AdminSidebar` 使用上下文并在品牌区域下方显示：

```tsx
const { canWrite } = useAdminAccess()

<div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
  <span className="text-xs font-bold text-white/62">
    {canWrite ? adminCopy.shell.adminMode : adminCopy.shell.guestMode}
  </span>
  {!canWrite ? (
    <Link className="text-xs font-extrabold text-white" href="/login">
      {adminCopy.shell.adminLogin}
    </Link>
  ) : null}
</div>
```

- [ ] **步骤 6：运行界面状态测试和类型检查**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="root layout|Admin shell|sidebar distinguishes"
pnpm --filter @zouma/admin type-check
```

预期：所选测试与类型检查通过。

- [ ] **步骤 7：提交界面访问状态**

```bash
git add apps/admin/src/components/admin-access.tsx apps/admin/src/lib/admin-access-ui-contract.test.ts apps/admin/src/app/layout.tsx apps/admin/src/app/admin-shell.tsx apps/admin/src/components/admin-sidebar.tsx apps/admin/src/lib/admin-copy.ts
git commit -m "feat(admin): 展示访客与管理员模式"
```

---

### Task 3：禁用访客未获批准的写操作

**文件：**

- 修改：`apps/admin/src/lib/admin-access-ui-contract.test.ts`
- 修改：`apps/admin/src/components/active-alerts-panel.tsx`
- 修改：`apps/admin/src/components/recommendation-review-panel.tsx`
- 修改：`apps/admin/src/app/feedback-admin.tsx`
- 修改：`apps/admin/src/app/(assets-commerce)/activities/page.tsx`
- 修改：`apps/admin/src/app/(assets-commerce)/harvest/page.tsx`
- 修改：`apps/admin/src/app/(assets-commerce)/products/page.tsx`
- 修改：`apps/admin/src/app/(assets-commerce)/trees/page.tsx`
- 修改：`apps/admin/src/app/(ai-system)/ai-assistant/page.tsx`
- 修改：`apps/admin/src/app/(ai-system)/devices/page.tsx`
- 修改：`apps/admin/src/app/(ai-system)/infrastructure/page.tsx`
- 修改：`apps/admin/src/app/(command)/reports/page.tsx`
- 修改：`apps/admin/src/app/(field-ops)/alerts/page.tsx`
- 修改：`apps/admin/src/app/(village-work)/farming/page.tsx`
- 修改：`apps/admin/src/app/(village-work)/tasks/page.tsx`
- 修改：`apps/admin/src/app/(village-work)/villagers/page.tsx`
- 修改：`apps/admin/src/app/(village-work)/simulations/page.tsx`
- 修改：`apps/admin/src/components/simulation/runs-panel.tsx`
- 修改：`apps/admin/src/components/simulation/comparison-panel.tsx`
- 修改：`apps/admin/src/components/simulation/bad-cases-panel.tsx`

**接口：**

- 使用：`useAdminAccess()`
- 使用：`adminWriteControlProps(canWrite, disabled?)`
- 保留匿名能力：问答、内容生成、周度诊断和设施决策生成

- [ ] **步骤 1：先写受保护控件和访客能力失败测试**

在 `admin-access-ui-contract.test.ts` 增加受保护文件清单：

```ts
const protectedControlSources = [
  "../components/active-alerts-panel.tsx",
  "../components/recommendation-review-panel.tsx",
  "../app/feedback-admin.tsx",
  "../app/(assets-commerce)/activities/page.tsx",
  "../app/(assets-commerce)/harvest/page.tsx",
  "../app/(assets-commerce)/products/page.tsx",
  "../app/(assets-commerce)/trees/page.tsx",
  "../app/(ai-system)/devices/page.tsx",
  "../app/(command)/reports/page.tsx",
  "../app/(field-ops)/alerts/page.tsx",
  "../app/(village-work)/farming/page.tsx",
  "../app/(village-work)/tasks/page.tsx",
  "../app/(village-work)/villagers/page.tsx",
  "../components/simulation/runs-panel.tsx",
  "../components/simulation/comparison-panel.tsx",
  "../components/simulation/bad-cases-panel.tsx",
]

test("every protected mutation surface consumes the shared write guard", () => {
  for (const relativePath of protectedControlSources) {
    const fileSource = source(relativePath)
    assert.match(fileSource, /useAdminAccess/, relativePath)
    assert.match(fileSource, /adminWriteControlProps/, relativePath)
  }
})
```

为混合权限页面新增精确断言：

```ts
test("guest AI questions remain enabled while human escalation requires login", () => {
  const page = source("../app/(ai-system)/ai-assistant/page.tsx")
  assert.match(page, /onClick=\{askQuestion\}/)
  assert.match(page, /onClick=\{\(\) => transferToHuman\(item\)\}[\s\S]{0,240}adminWriteControlProps/)
})

test("guest decision generation remains enabled while command changes require login", () => {
  const page = source("../app/(ai-system)/infrastructure/page.tsx")
  assert.match(page, /onClick=\{runDecision\}/)
  assert.match(page, /updateCommand[\s\S]*adminWriteControlProps/)
  assert.match(page, /submitManualReading[\s\S]*adminWriteControlProps/)
})

test("renovation diagnosis and content generation remain guest capabilities", () => {
  const renovation = source("../app/(renovation)/renovation/page.tsx")
  const contentFactory = source("../app/(ai-system)/content-factory/page.tsx")
  assert.match(renovation, /onClick=\{runDiagnosis\}/)
  assert.match(contentFactory, /\/ai\/generate-content/)
})
```

- [ ] **步骤 2：运行界面权限契约并确认失败**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="protected mutation|guest AI|guest decision|renovation diagnosis"
```

预期：受保护页面尚未使用共享写权限，相关断言失败；已存在的访客能力定位断言通过。

- [ ] **步骤 3：为普通受保护页面接入统一写权限**

在每个受保护页面或组件中导入：

```tsx
import {
  adminWriteControlProps,
  useAdminAccess,
} from "@admin/components/admin-access"
```

在组件顶部读取：

```tsx
const { canWrite } = useAdminAccess()
```

为写按钮合并现有禁用状态：

```tsx
<button
  {...adminWriteControlProps(canWrite, isSaving)}
  onClick={saveRecord}
  type="button"
>
  保存
</button>
```

为仅用于写入的表单区域使用 `fieldset`，但不要包住搜索、筛选、刷新、记录选择或详情查看控件：

```tsx
<fieldset
  className="m-0 min-w-0 border-0 p-0"
  {...adminWriteControlProps(canWrite)}
>
  {/* 仅包含写入表单及其提交按钮 */}
</fieldset>
```

逐文件保护如下操作：

| 文件 | 必须保护的操作 |
| --- | --- |
| `active-alerts-panel.tsx` | 确认告警并创建任务 |
| `recommendation-review-panel.tsx` | 批准、拒绝建议 |
| `feedback-admin.tsx` | 处理备注与状态流转 |
| `activities/page.tsx` | 创建活动、修改活动状态 |
| `harvest/page.tsx` | 确认预约、更新预约状态、保存物流 |
| `products/page.tsx` | 创建产品 |
| `trees/page.tsx` | 保存档案、添加养护记录、上传图片 |
| `devices/page.tsx` | 新增设备 |
| `reports/page.tsx` | 生成日报 |
| `alerts/page.tsx` | 确认或修改告警状态 |
| `farming/page.tsx` | 新增或修改农事 |
| `tasks/page.tsx` | 新增或修改任务、履约审核 |
| `villagers/page.tsx` | 新增或修改村民 |

任何原有 `disabled={isLoading}` 改为 `adminWriteControlProps(canWrite, isLoading)`；不要删除已有加载、防重复提交或业务状态禁用条件。

- [ ] **步骤 4：处理 AI 助手和设施管理的混合权限**

在 AI 助手中保持 `askQuestion` 按钮原有禁用条件：

```tsx
disabled={isAsking || !question.trim()}
```

只给转人工按钮增加：

```tsx
{...adminWriteControlProps(
  canWrite,
  transferredIds.has(item.id),
)}
```

在设施页面保持 `runDecision` 按钮匿名可用：

```tsx
disabled={isDeciding}
```

只保护手工录入、批准、拒绝和标记执行：

```tsx
<button
  {...adminWriteControlProps(canWrite)}
  onClick={submitManualReading}
  type="button"
>
  录入
</button>

<button
  {...adminWriteControlProps(canWrite)}
  onClick={() => updateCommand(command.id, "approved")}
  type="button"
>
  批准
</button>
```

内容工厂与空间改造周度诊断不接入写权限禁用；它们仍受 BFF 精确白名单和 Web API 限流保护。

- [ ] **步骤 5：保护模拟工作台写操作**

`runs-panel.tsx`、`comparison-panel.tsx` 和 `bad-cases-panel.tsx` 直接使用访问上下文，不改变页面数据读取、筛选、标签页、导出或详情选择。

运行、复制、归档、生成对比和保存复盘按钮使用：

```tsx
const { canWrite } = useAdminAccess()

<button
  {...adminWriteControlProps(canWrite, running)}
  onClick={onRunPair}
  type="button"
>
  一键运行 V0/V1 模拟对照
</button>
```

配置输入若只用于创建新运行，也必须放入受保护 `fieldset`；运行列表选择、刷新、查看详情和 GET 导出保持可用。

- [ ] **步骤 6：运行界面权限测试并确认通过**

运行：

```bash
pnpm --filter @zouma/admin test -- --test-name-pattern="protected mutation|guest AI|guest decision|renovation diagnosis"
pnpm --filter @zouma/admin test
pnpm --filter @zouma/admin type-check
```

预期：所有 Admin 测试通过，类型检查无错误。逐页检查契约清单，确认不存在受保护写按钮遗漏。

- [ ] **步骤 7：提交界面写权限**

```bash
git add apps/admin/src/lib/admin-access-ui-contract.test.ts apps/admin/src/components apps/admin/src/app
git commit -m "feat(admin): 限制访客写操作"
```

---

### Task 4：更新文档并完成质量门禁

**文件：**

- 修改：`apps/admin/README.md`
- 修改：`ARCHITECTURE.md`

**接口：**

- 不新增运行时接口。
- 文档必须与 `2026-07-28-admin-guest-access-design.md` 和实际实现一致。

- [ ] **步骤 1：更新 Admin 安全模型文档**

将 `apps/admin/README.md` 的安全模型更新为：

```markdown
## 安全模型

- 匿名访客可以浏览全部后台数据，并可调用知识问答、运营问答、内容生成、空间诊断和设施决策建议生成。
- 除上述精确白名单外，所有写操作都必须持有有效管理员 HttpOnly 会话。
- 管理员口令只提交给本应用的 session Route Handler；登录成功后使用签名 HttpOnly cookie。
- Admin BFF 在服务端附加 `ADMIN_API_TOKEN`，浏览器不会接触该 token。
- 生产环境必须设置强 `ADMIN_LOGIN_PASSWORD` 和至少 32 字符的 `ADMIN_SESSION_SECRET`。
- 访客读取范围包含现有接口返回的业务数据和个人信息，部署前必须确认该公开范围符合运营要求。
```

- [ ] **步骤 2：更新架构说明**

在 `ARCHITECTURE.md` 的 Admin 部分明确：

```markdown
- Admin 页面与读取接口允许匿名访客访问；五个精确生成能力允许匿名调用。
- 其他写请求必须通过 HttpOnly 管理员会话，并由 Admin BFF 在服务端执行最终鉴权。
- 服务端之间的后台令牌不会发送给浏览器。
```

同时把“经过身份验证的后台代理”改为“支持访客读取与管理员写入的后台代理”，不要声称全部后台请求都要求登录。

- [ ] **步骤 3：运行完整仓库门禁**

依次运行并保留每项退出码：

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
```

预期：所有命令退出码均为 `0`，测试无失败，构建无错误。

- [ ] **步骤 4：运行模拟相关检查**

由于模拟工作台写控件发生变化，运行：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
```

预期：模拟包测试通过，固定种子 `20260713` 的 `NORMAL` 场景运行成功；生成物保留在 Git 忽略目录，不加入提交。

- [ ] **步骤 5：核对最终差异与安全边界**

运行：

```bash
git status --short
git diff --stat cf5f5d6
git diff --check
rg -n "NEXT_PUBLIC_ADMIN_API_TOKEN|ADMIN_API_TOKEN" apps/admin/src
```

预期：

- 只有计划内代码和文档发生变化；
- `ADMIN_API_TOKEN` 仅出现在服务端 Route Handler、BFF 或防泄漏测试中；
- 没有 `.env.local`、`output/`、`outputs/`、缓存或模拟产物进入 Git；
- 匿名能力严格等于所有 `GET/HEAD` 加五个精确 `POST`；
- 其他写操作仍要求有效管理员会话。

- [ ] **步骤 6：提交文档与验收记录**

```bash
git add apps/admin/README.md ARCHITECTURE.md
git commit -m "docs(admin): 更新访客访问安全模型"
```
