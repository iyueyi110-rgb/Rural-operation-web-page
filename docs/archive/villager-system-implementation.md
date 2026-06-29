# 走马村 — 村民端 / 通知推送 / 互动任务 补全执行指令

> **目标：** 修复三个核心缺口——村民端缺失、反馈通道单向、游客互动任务空白。
> **执行原则：** 严格遵循现有代码风格（Next.js App Router + Prisma + `jsonResponse` + `isAdminRequest`），不破坏已有功能。

---

## 一、总览

```
Phase 1 (数据库) → Phase 2 (API) → Phase 3 (前台页面) → Phase 4 (集成钩子)
     2 个新模型            6 组路由              5 个页面               4 个集成点
```

| Phase | 内容 | 预估文件数 |
|---|---|---|
| Phase 1 | Prisma schema 新增 2 模型 + 修改 2 模型 + 迁移 | 1 schema 修改 |
| Phase 2 | 通知 API + 村民自助 API + 互动任务 API + PATCH handler | 7 个 route.ts |
| Phase 3 | 村民轻门户 + 通知中心 + 互动面板 | 6 个 page.tsx + 2 组件 |
| Phase 4 | 告警→通知 / 日报→通知 / 养护→通知 / 认养→互动 / 任务→通知 | 5 个集成点修改 |

---

## 二、Phase 1：数据库

### 2.1 新增模型 `Notification`

在 `packages/database/prisma/schema.prisma` 中，`ControlCommand` 模型之后追加：

```prisma
model Notification {
  id            String   @id @default(cuid())
  recipientType String   // "villager" | "tourist" | "operator"
  recipientId   String   // villager.id 或 adopterPhone 或 "all"
  title         String
  body          String   @db.Text
  channel       String   @default("in_app")  // "in_app" | "sms" | "wechat"（后两种预留）
  category      String   // "task" | "alert" | "report" | "tree" | "activity" | "system"
  refType       String?  // 关联实体类型 "task" | "alert" | "report" | "tree_adoption"
  refId         String?  // 关联实体 ID
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([recipientType, recipientId, createdAt])
  @@index([isRead, createdAt])
  @@map("notification")
}
```

### 2.2 新增模型 `VisitorInteractionTask`

```prisma
model VisitorInteractionTask {
  id            String   @id @default(cuid())
  adoptionId    String
  treeId        String
  taskType      String   // "watering" | "fertilizing" | "photo_upload" | "diary" | "share"
  title         String
  description   String?  @db.Text
  status        String   @default("pending")  // "pending" | "completed" | "expired"
  completedAt   DateTime?
  imageUrl      String?
  note          String?  @db.Text
  points        Int      @default(0)  // 完成积分
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  adoption      TreeAdoption @relation(fields: [adoptionId], references: [id])
  tree          OrchardTree  @relation(fields: [treeId], references: [id])

  @@index([adoptionId, status, createdAt])
  @@index([treeId, createdAt])
  @@map("visitor_interaction_task")
}
```

> ⚠️ **同时修改 `TreeAdoption` 和 `OrchardTree` 模型**，在两个模型中各追加一行反向关系：
> ```prisma
> // TreeAdoption 中追加：
> interactionTasks VisitorInteractionTask[]
>
> // OrchardTree 中追加：
> interactionTasks VisitorInteractionTask[]
> ```
> 否则 Prisma migrate 会报关系不完整错误。

### 2.3 修改 `Villager` 模型

在 `Villager` 模型中增加一个字段（用于村民登录验证码）：

```prisma
model Villager {
  // ... 已有字段保持不变 ...
  otpCode     String?   // 6 位验证码
  otpExpiry   DateTime? // 验证码过期时间
  // ...
}
```

### 2.4 修改 `TreeAdoption` 模型

增加 `adopterId` 字段用于关联游客身份（为后续登录体系预留）：

```prisma
model TreeAdoption {
  // ... 已有字段保持不变 ...
  adopterId    String?   // 游客唯一标识（待 Epic 10 登录体系补全后关联）
  // ...
}
```

### 2.5 迁移命令

```bash
cd packages/database
npx prisma migrate dev --name add_notification_and_interaction
```

> ⚠️ 此命令会同时生成 Prisma Client 类型，后续 API 代码中的 `prisma.notification` 和 `prisma.visitorInteractionTask` 才可用。

---

## 三、Phase 2：API 路由

### 3.1 通知 API

**文件：** `apps/web/src/app/api/v1/notifications/route.ts`

```
GET  /api/v1/notifications?recipientType=villager&recipientId={id}&isRead=false
POST /api/v1/notifications
PATCH /api/v1/notifications  (body: { id, isRead: true } 或 { markAllRead: true, recipientType, recipientId })
```

**关键实现约束：**

- GET 支持 `recipientType`、`recipientId`、`isRead`、`category` 四个可选筛选参数
- GET 按 `createdAt desc` 排序，默认返回最近 50 条
- POST 必填字段：`recipientType`、`recipientId`、`title`、`body`、`category`
- POST 不需要 admin 权限——它是一个内部 API，由系统钩子调用
- PATCH 支持单条 `{ id, isRead: true }` 或批量 `{ markAllRead: true, recipientType, recipientId }`
- 始终使用 `jsonResponse(request, ...)` 和 `optionsResponse(request)` 模式
- 参考 `apps/web/src/app/api/v1/villagers/route.ts` 的代码结构

### 3.2 村民自助 API

#### 3.2.1 村民登录

**文件：** `apps/web/src/app/api/v1/villager-auth/request-otp/route.ts`

```
POST /api/v1/villager-auth/request-otp  body: { phone }
```

- 查找 `Villager` 表中匹配 phone 且 status="active" 的记录
- 生成 6 位随机数字验证码，写入 `otpCode` + `otpExpiry`（now + 5分钟）
- **当前阶段不接入短信**——验证码直接返回在 response 中（开发/试运营阶段方案）
- 返回 `{ success: true, message: "验证码已生成" }`
- 若 phone 未匹配任何 active 村民，返回 `{ error: "未找到匹配村民" }` 状态码 404

#### 3.2.2 村民验证登录

**文件：** `apps/web/src/app/api/v1/villager-auth/verify-otp/route.ts`

```
POST /api/v1/villager-auth/verify-otp  body: { phone, otp }
```

- 校验 phone + otp + otpExpiry > now
- 通过后生成一个简单的 token：`villager_` + villager.id + `_` + 时间戳（base64）
- 返回 `{ token, villager: { id, name, skills, nodeId, status } }`
- 失败返回 401

> **简化方案：** 在 Epic 10（统一登录）完成前，此 token 仅作为村民身份的轻量凭证，存储在 localStorage。API 通过 `X-Villager-Token` header 验证。

#### 3.2.3 村民自助查询

**文件：** `apps/web/src/app/api/v1/villager/me/route.ts`

```
GET /api/v1/villager/me  header: X-Villager-Token
```

- 解析 token 获取 villagerId
- 返回该村民的完整信息（含 taskSummary、monthlyTaskSummary）
- GET `/api/v1/villager/me/tasks` 返回该村民的任务列表（支持 status 筛选）
- PATCH `/api/v1/villager/me/tasks` body: `{ id, status }`——村民只能将任务从 pending→accepted→in_progress→completed

**身份校验函数：**

在 `apps/web/src/lib/villager-auth.ts` 中新增（新建文件，不修改 tree-records.ts）：

```ts
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 天

export function getVillagerIdFromToken(request: Request): string | null {
  const token = request.headers.get("X-Villager-Token")
  if (!token || !token.startsWith("villager_")) return null
  try {
    const decoded = Buffer.from(token.replace("villager_", ""), "base64").toString("utf-8")
    const [id, timestampStr] = decoded.split("_")
    if (!id || !timestampStr) return null
    const timestamp = Number(timestampStr)
    if (!Number.isFinite(timestamp)) return null
    // 检查是否超过 7 天
    if (Date.now() - timestamp > TOKEN_MAX_AGE_MS) return null
    return id
  } catch {
    return null
  }
}
```

> **注意：** 此函数放在新建的 `apps/web/src/lib/villager-auth.ts` 中，**不修改 `tree-records.ts`**。原计划放在 tree-records.ts 中不合理——villager-auth 与 tree-records 是两个独立域。

### 3.3 互动任务 API

**文件：** `apps/web/src/app/api/v1/interactions/route.ts`

```
GET  /api/v1/interactions?adoptionId={id}&status=pending
POST /api/v1/interactions
PATCH /api/v1/interactions  body: { id, status: "completed", note?, imageUrl? }
```

**关键实现约束：**

- GET 按 `adoptionId` 筛选（必填），可选 `status`
- POST 必填字段：`adoptionId`、`treeId`、`taskType`、`title`
- POST 不需要 admin 权限——**任何认养人都可以给自己创建互动记录**（通过 adoptionId 关联）
- PATCH 更新状态：pending→completed，同时写入 `completedAt`、`note`、`imageUrl`
- 互动任务类型枚举：`"watering" | "fertilizing" | "photo_upload" | "diary" | "share"`
- 完成时给予积分：watering=10, fertilizing=10, photo_upload=15, diary=20, share=15

### 3.4 API 文件清单

```
apps/web/src/app/api/v1/
├── notifications/
│   └── route.ts              # GET + POST + PATCH
├── villager-auth/
│   ├── request-otp/
│   │   └── route.ts          # POST
│   └── verify-otp/
│       └── route.ts          # POST
├── villager/
│   └── me/
│       ├── route.ts          # GET 村民个人信息
│       └── tasks/
│           └── route.ts      # GET + PATCH 村民任务
├── tree-adoptions/
│   └── route.ts              # 新增 PATCH handler（修改已有文件）
└── interactions/
    └── route.ts              # GET + POST + PATCH
```

---

## 四、Phase 3：前台页面

### 4.1 村民轻门户

所有村民页面放在 `apps/web/src/app/[locale]/villager/` 下，与现有前台共享 i18n 和 layout。

> **前置依赖：** 游客端需在认养/预约/购票流程中缓存手机号到 `localStorage`，key 为 `"tourist_phone"`。
> 修改 3 个现有文件各加 1 行：
> - `adoption-flow.tsx`：提交认养后 → `localStorage.setItem("tourist_phone", phone)`
> - `booking-flow.tsx`：提交预约后 → `localStorage.setItem("tourist_phone", phone)`
> - `ticket-flow.tsx`：提交购票后 → `localStorage.setItem("tourist_phone", phone)`

#### 4.1.1 村民登录页

**文件：** `apps/web/src/app/[locale]/villager/login/page.tsx`

- 手机号输入框 + 获取验证码按钮 + 验证码输入框
- 调用 `/api/v1/villager-auth/request-otp` + `/api/v1/villager-auth/verify-otp`
- 成功后 token 存入 localStorage，跳转 dashboard
- UI 风格参考现有 `booking-flow.tsx` 的简洁移动端适配风格

#### 4.1.2 村民仪表盘

**文件：** `apps/web/src/app/[locale]/villager/dashboard/page.tsx`

- 顶部：村民姓名 + 技能标签
- 统计卡片：本月完成任务数 / 本月收益 / 待处理任务数
- 最新 5 条通知
- 最近 5 条任务

#### 4.1.3 村民任务列表

**文件：** `apps/web/src/app/[locale]/villager/tasks/page.tsx`

- 按状态 Tab 切换（待接取 / 进行中 / 已完成）
- 每项展示：标题、类型、节点、收益、截止日期
- 点击可展开详情 + 操作按钮（接取 / 开始 / 完成）

#### 4.1.4 村民收益页

**文件：** `apps/web/src/app/[locale]/villager/earnings/page.tsx`

- 累计收益 + 本月收益 + 收益趋势
- 已完成任务列表（带收益金额）
- UI 简洁，移动端优先

#### 4.1.5 村民布局

**文件：** `apps/web/src/app/[locale]/villager/layout.tsx`

> ⚠️ **必须添加 `"use client"` 指令**——layout 中需要读取 localStorage 中的 villager token，只有 Client Component 可以访问 localStorage。

- **第一行：** `"use client"`
- 在 `useEffect` 中检查 `localStorage.getItem("villager_token")`
  - 取不到 → `router.replace("/villager/login")`
  - 取到后还需验证 token 未过期（解码 base64 提取时间戳，超过 7 天视为过期）
- 底部 TabBar（`position: fixed; bottom: 0`）包含 4 个 tab：
  - 📊 仪表盘 → `/villager/dashboard`
  - 📋 任务 → `/villager/tasks`
  - 💰 收益 → `/villager/earnings`
  - 🔔 通知 → `/villager/notifications`（村民版通知列表）
- **不与游客前台共享 Header**——村民门户使用独立导航

> 村民通知页面也需新建：`apps/web/src/app/[locale]/villager/notifications/page.tsx`，调用 `GET /api/v1/notifications?recipientType=villager&recipientId={villagerId}`

### 4.2 通知中心（游客通用）

#### 4.2.1 通知图标 + 未读角标

**文件：** 新建 `apps/web/src/components/notification-bell.tsx`

- **渲染方式：浮动按钮**，`position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 50`
  - 原因：当前页面架构没有共享 Header 组件（每个 page.tsx 各自渲染 header），浮层方案不需要修改任何现有页面
- 铃铛图标（`Bell` from lucide-react）+ 红色角标显示未读数量
- 挂在 `apps/web/src/app/[locale]/layout.tsx` 中——在 `<NextIntlClientProvider>{children}</NextIntlClientProvider>` 之后追加 `<NotificationBell />`
  - 因为是浮动定位，不影响现有布局
  - `NotificationBell` 必须是 Client Component（`"use client"`）
- **获取游客手机号的方式：**
  - 从 `localStorage` 读取 key `"tourist_phone"`——该值在认养/预约/购票流程中写入
  - 如果取不到 phone，组件不渲染（返回 null）——未登录游客不显示铃铛
- 调用 `GET /api/v1/notifications?recipientType=tourist&recipientId={phone}&isRead=false` 获取未读数
- 角标 > 99 显示 "99+"
- 每 30 秒轮询一次（`setInterval`）
- 点击跳转 `/me/notifications`

#### 4.2.2 通知列表页

**文件：** `apps/web/src/app/[locale]/me/notifications/page.tsx`

- 通知列表：标题 + 摘要 + 时间 + 已读/未读状态
- 点击标记已读
- "全部已读"按钮
- 按分类筛选（任务/告警/树木/活动/系统）

### 4.3 游客互动任务面板

#### 4.3.1 树详情页互动面板

**修改文件：** `apps/web/src/app/[locale]/trees/[code]/page.tsx`

在树详情页的养护日志下方，新增"我的互动"面板：

- 当该用户有此树的活跃认养（adopterPhone 匹配 + 认养状态 active）时显示
- 展示待完成的互动任务列表（watering / fertilizing / photo_upload / diary / share）
- 每个任务一个卡片：任务类型图标 + 标题 + 描述 + 积分 + 去完成按钮
- "去浇水"→ 展示"已完成浇水"确认按钮 + 可选备注输入
- "去施肥"→ 同上
- "拍照上传"→ 调起文件上传
- "写养护日记"→ 文本框输入
- "分享"→ 生成分享文案供复制

#### 4.3.2 互动任务自动生成

**新建文件：** `apps/web/src/lib/interaction-generator.ts`

```ts
// 当认养状态变为 active 时调用
// 根据认养计划和季节生成初始互动任务
// 例如：每周浇水×1、每月施肥×1、每月拍照×1
export async function generateInteractionTasks(adoptionId: string, treeId: string)
```

---

## 五、Phase 4：集成钩子

### 5.1 告警 → 通知

**修改文件：** `apps/web/src/lib/alert-engine.ts`

在 `createAlertIfAbsent` 函数成功后，追加：

```ts
// 创建通知（异步，不阻塞告警流程）
const alertTypeLabel: Record<string, string> = {
  night_linger: "夜间滞留告警",
  crowd: "人流拥堵告警",
  waterside: "近水风险告警",
  reverse_path: "逆向穿行告警",
  fire_risk: "火险告警",
  flood_risk: "洪涝告警",
}

prisma.notification.create({
  data: {
    recipientType: "operator",
    recipientId: "all",
    title: `[${alert.severity === "high" ? "🔴" : "🟡"}] ${alertTypeLabel[alert.alertType] ?? alert.alertType}`,
    body: alert.message,
    category: "alert",
    refType: "alert",
    refId: alert.id,
  },
}).catch((error) => console.error("Failed to create alert notification:", error))
```

### 5.2 日报 → 通知

**修改文件：** `apps/web/src/lib/report-generator.ts`

在 `generateDailyReport` 函数成功 upsert 日报后，追加：

```ts
prisma.notification.create({
  data: {
    recipientType: "operator",
    recipientId: "all",
    title: `📊 运营日报已生成（${date}）`,
    body: reportPayload.summary.slice(0, 200),
    category: "report",
    refType: "report",
    refId: date,
  },
}).catch((error) => console.error("Failed to create report notification:", error))
```

### 5.3 养护建议 → 通知

**修改文件：** `apps/web/src/lib/care-advisor.ts`

> ⚠️ `generateCareAdvice()` 返回 `Promise<string>`（一段面向所有树的养护建议文本），**不是** `{treeId, content}` 结构。不能按单棵树发送通知。

在 `generateCareAdvice` 函数末尾、`return result.content.trim()` 之前，追加：

```ts
// 养护建议生成成功后，通知所有活跃认养人
if (result.content.trim() !== careAdviceFallback) {
  const activeAdoptions = await prisma.treeAdoption.findMany({
    where: { status: "active" },
    select: { adopterPhone: true, id: true },
    distinct: ["adopterPhone"],
  })

  const phoneSet = new Set(
    activeAdoptions
      .map((adoption) => adoption.adopterPhone)
      .filter((phone): phone is string => typeof phone === "string" && phone.length > 0)
  )

  await Promise.allSettled(
    Array.from(phoneSet).map((phone) =>
      prisma.notification.create({
        data: {
          recipientType: "tourist",
          recipientId: phone,
          title: "🌳 你的果园本周有新的养护建议",
          body: result.content.trim().slice(0, 300),
          category: "tree",
        },
      })
    )
  ).catch((error) => console.error("Failed to create care notifications:", error))
}
```

> **注意：** 使用 `Promise.allSettled` 并发发送（不用 `for` 循环串行），避免单个通知失败阻塞整体流程。

### 5.4 认养激活 → 生成互动任务

**修改文件：** `apps/web/src/app/api/v1/tree-adoptions/route.ts`

**首先——该路由当前仅有 GET 和 POST，需要新增 PATCH handler：**

在现有 POST handler 之后追加 PATCH（参考 `apps/web/src/app/api/v1/tasks/route.ts` 的 PATCH 模式）：

```ts
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid update" }, { status: 400 })
  }

  const existing = await prisma.treeAdoption.findUnique({ where: { id: body.id } })
  if (!existing) {
    return jsonResponse(request, { error: "Adoption not found" }, { status: 404 })
  }

  const validStatuses = ["pending_payment", "active", "completed", "cancelled"]
  const nextStatus = typeof body.status === "string" && validStatuses.includes(body.status)
    ? body.status
    : existing.status

  const data = await prisma.treeAdoption.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      ...(typeof body.adopterName === "string" ? { adopterName: body.adopterName.trim() } : {}),
      ...(typeof body.adopterPhone === "string" ? { adopterPhone: body.adopterPhone.trim() } : {}),
    },
  })

  // 🔑 核心钩子：认养激活时生成互动任务
  if (nextStatus === "active" && existing.status !== "active") {
    generateInteractionTasks(data.id, data.treeId).catch(
      (error) => console.error("Failed to generate interaction tasks:", error)
    )
  }

  return jsonResponse(request, { data: { id: data.id, status: data.status, updatedAt: data.updatedAt.toISOString() } })
}
```

> `generateInteractionTasks` 的实现（放在 `apps/web/src/lib/interaction-generator.ts`）：
> - 查树的 `harvestSeason` 字段
> - 生成未来 4 周任务：每周 1 次浇水 + 每月 1 次施肥 + 每月 1 次拍照 + 每月 1 次日记
> - **使用 `prisma.visitorInteractionTask.createMany` 批量创建**
> - 生成前检查是否已有 pending 任务（避免重复）：`prisma.visitorInteractionTask.findFirst({ where: { adoptionId, status: "pending" } })`

### 5.5 村民任务分配 → 通知

**修改文件：** `apps/web/src/app/api/v1/tasks/route.ts`

在 POST 创建任务时，如果指定了 `villagerId`，追加：

```ts
if (villagerId) {
  prisma.notification.create({
    data: {
      recipientType: "villager",
      recipientId: villagerId,
      title: `📋 新任务：${title}`,
      body: description?.slice(0, 200) ?? "",
      category: "task",
      refType: "task",
      refId: data.id,
    },
  }).catch((error) => console.error("Failed to create task notification:", error))
}
```

---

## 六、执行顺序

```
Step 1: 修改 Prisma schema → 运行 migrate → 验证 prisma client 生成
Step 2: 新建 villager-auth.ts（token 校验函数，纯函数，无依赖）
Step 3: 新建 interaction-generator.ts（互动任务生成器，依赖 Step 1 模型）
Step 4: 新建 notifications/route.ts（独立 API）
Step 5: 新建 villager-auth/ 两个路由（依赖 Step 2）
Step 6: 新建 villager/me/ 两个路由（依赖 Step 2 + 5）
Step 7: 新建 interactions/route.ts（依赖 Step 1 模型）
Step 8: 修改 tree-adoptions/route.ts（新增 PATCH handler + Step 3 钩子）
Step 9: Phase 4 其余集成钩子（修改 alert-engine / report-generator / care-advisor / tasks 共 4 个文件）
Step 10: 新建前端组件 notification-bell.tsx + villager-auth.ts（前端 fetch 工具）
Step 11: 新建村民门户页面（6 个 page.tsx + 1 个 layout.tsx）
Step 12: 新建通知中心页面 + 修改树详情页（增加互动面板）
```

**并行机会：** Step 3-7 可并行，Step 10-12 可并行。

---

## 七、文件变更总清单

### 新建文件（18 个）

```
packages/database/prisma/migrations/..._add_notification_and_interaction/
apps/web/src/lib/villager-auth.ts                  # getVillagerIdFromToken（从 tree-records 中独立出来）
apps/web/src/lib/interaction-generator.ts          # generateInteractionTasks
apps/web/src/app/api/v1/notifications/route.ts
apps/web/src/app/api/v1/villager-auth/request-otp/route.ts
apps/web/src/app/api/v1/villager-auth/verify-otp/route.ts
apps/web/src/app/api/v1/villager/me/route.ts
apps/web/src/app/api/v1/villager/me/tasks/route.ts
apps/web/src/app/api/v1/interactions/route.ts
apps/web/src/components/notification-bell.tsx       # 浮动铃铛（Client Component）
apps/web/src/app/[locale]/villager/layout.tsx       # "use client" + token 校验
apps/web/src/app/[locale]/villager/login/page.tsx
apps/web/src/app/[locale]/villager/dashboard/page.tsx
apps/web/src/app/[locale]/villager/tasks/page.tsx
apps/web/src/app/[locale]/villager/earnings/page.tsx
apps/web/src/app/[locale]/villager/notifications/page.tsx
apps/web/src/app/[locale]/me/notifications/page.tsx # 游客通知中心
```

### 修改文件（8 个）

```
packages/database/prisma/schema.prisma                # 新增 2 模型 + 修改 TreeAdoption + OrchardTree 反关系 + 修改 Villager
apps/web/src/app/api/v1/tree-adoptions/route.ts       # 新增 PATCH handler + 激活钩子
apps/web/src/app/api/v1/tasks/route.ts                 # 任务分配→通知钩子
apps/web/src/lib/alert-engine.ts                       # 告警→通知钩子
apps/web/src/lib/report-generator.ts                   # 日报→通知钩子
apps/web/src/lib/care-advisor.ts                       # 养护→通知钩子
apps/web/src/app/[locale]/layout.tsx                   # 引入 <NotificationBell />
apps/web/src/app/[locale]/trees/[code]/page.tsx        # 增加互动面板
