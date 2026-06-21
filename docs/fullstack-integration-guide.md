# 走马村云脑系统 — 全栈集成执行指令

> **目标：** 将村民端、通知推送、互动任务三大模块完整集成到现有前后端。
> **原则：** 新增代码严格遵循现有模式（`jsonResponse`、type guard、`isPlainObject`、`"use client"`），修改代码只追加不覆盖。

---

## 一、系统架构总览

```
apps/web/src/app/
├── [locale]/                          # 前台（已有）
│   ├── page.tsx                       # [改] Header 加村民入口链接
│   ├── layout.tsx                     # [改] 引入 NotificationBell
│   ├── booking/booking-flow.tsx       # [改] localStorage 写 tourist_phone
│   ├── tickets/ticket-flow.tsx        # [改] localStorage 写 tourist_phone
│   ├── trees/adoption-flow.tsx        # [改] localStorage 写 tourist_phone
│   ├── trees/[code]/page.tsx          # [改] 引入 InteractionPanel
│   ├── villager/                      # [新] 村民轻门户（6 页面）
│   └── me/notifications/              # [新] 游客通知中心
├── api/v1/
│   ├── notifications/route.ts         # [新] 通知 CRUD
│   ├── villager-auth/                 # [新] 村民 OTP 登录
│   ├── villager/me/                   # [新] 村民自助 API
│   ├── interactions/route.ts          # [新] 互动任务 API
│   ├── interactions/upload/route.ts   # [新] 互动照片上传
│   ├── tree-adoptions/route.ts        # [改] 新增 PATCH + 激活通知
│   └── tasks/route.ts                 # [改] 任务分配→村民通知
├── components/
│   ├── notification-bell.tsx          # [新] 浮动通知铃铛
│   └── interaction-panel.tsx          # [新] 互动任务面板
├── lib/
│   ├── villager-auth.ts               # [新] Token 签发/校验（服务端）
│   ├── villager-auth-client.ts        # [新] Token 存储/读取（客户端）
│   ├── villager-portal.ts             # [新] 村民端类型定义
│   ├── villager-page-metadata.ts      # [新] 村民页面元数据
│   ├── interaction-generator.ts       # [新] 互动任务生成器
│   ├── interaction-generator.test.ts  # [新] 单元测试
│   ├── interaction-tasks.ts           # [新] 互动任务类型+积分
│   ├── interaction-tasks.test.ts      # [新] 单元测试
│   ├── notification-hooks.ts          # [新] 通知工具函数
│   ├── notification-hooks.test.ts     # [新] 单元测试
│   ├── alert-engine.ts                # [改] 告警→通知钩子
│   ├── care-advisor.ts                # [改] 养护建议→通知钩子
│   └── report-generator.ts            # [改] 日报→通知钩子
├── messages/
│   ├── zh-CN.json                     # [改] +villagerSystem 命名空间
│   ├── en.json                        # [改] +villagerSystem 命名空间
│   └── ja.json                        # [改] +villagerSystem 命名空间

packages/database/prisma/
├── schema.prisma                      # [改] +Notification +VisitorInteractionTask
│                                      #      +Villager.otpCode/otpExpiry
│                                      #      +TreeAdoption.adopterId/interactionTasks
│                                      #      +OrchardTree.interactionTasks
└── migrations/                        # [新] 迁移文件

根目录:
├── start.bat                          # [改] 双击启动器
├── start.ps1                          # [新] PowerShell 一键启动
└── start.sh                           # [改] Bash 一键启动
```

---

## 二、Phase 1 — 数据库

### 2.1 修改 Prisma Schema

**文件：** `packages/database/prisma/schema.prisma`

#### 2.1.1 修改 Villager — 增加 OTP 字段

在 `Villager` 模型中，`status` 字段后、`createdAt` 前追加：

```prisma
  // TODO: 迁入统一登录系统后废弃
  otpCode   String?
  // TODO: 迁入统一登录系统后废弃
  otpExpiry DateTime?
```

#### 2.1.2 修改 TreeAdoption — 增加 adopterId + 反向关系

在 `TreeAdoption` 模型中，`adopterPhone` 字段后追加 `adopterId`，在 `tree` 关系后追加反向关系：

```prisma
  adopterId        String?
  // ... 在 tree 关系之后追加:
  interactionTasks VisitorInteractionTask[]
```

#### 2.1.3 修改 OrchardTree — 增加反向关系

在 `OrchardTree` 模型的 `harvestBookings` 后追加：

```prisma
  interactionTasks VisitorInteractionTask[]
```

#### 2.1.4 在 ControlCommand 模型之后新增 Notification 模型

```prisma
model Notification {
  id            String   @id @default(cuid())
  recipientType String
  recipientId   String
  title         String
  body          String   @db.Text
  channel       String   @default("in_app")
  category      String
  refType       String?
  refId         String?
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([recipientType, recipientId, createdAt])
  @@index([isRead, createdAt])
  @@map("notification")
}
```

#### 2.1.5 在 Notification 模型之后新增 VisitorInteractionTask 模型

```prisma
model VisitorInteractionTask {
  id          String       @id @default(cuid())
  adoptionId  String
  treeId      String
  taskType    String
  title       String
  description String?      @db.Text
  status      String       @default("pending")
  completedAt DateTime?
  imageUrl    String?
  note        String?      @db.Text
  points      Int          @default(0)
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  adoption    TreeAdoption @relation(fields: [adoptionId], references: [id])
  tree        OrchardTree  @relation(fields: [treeId], references: [id])

  @@index([adoptionId, status, createdAt])
  @@index([treeId, createdAt])
  @@map("visitor_interaction_task")
}
```

#### 2.1.6 运行迁移

```bash
cd packages/database
npx prisma migrate dev --name add_notification_and_interaction
```

---

## 三、Phase 2 — 新增 lib 工具函数

### 3.1 `villager-auth.ts` — Token 签发与校验（服务端）

**文件：** `apps/web/src/lib/villager-auth.ts`

```ts
const TOKEN_PREFIX = "villager_"
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function createVillagerToken(villagerId: string, timestamp = Date.now()) {
  return `${TOKEN_PREFIX}${Buffer.from(`${villagerId}_${timestamp}`, "utf-8").toString("base64")}`
}

export function getVillagerIdFromToken(request: Request, now = Date.now()): string | null {
  const token = request.headers.get("X-Villager-Token")
  if (!token?.startsWith(TOKEN_PREFIX)) return null

  try {
    const decoded = Buffer.from(token.slice(TOKEN_PREFIX.length), "base64").toString("utf-8")
    const [id, timestampValue, ...extra] = decoded.split("_")
    const timestamp = Number(timestampValue)

    if (!id || !timestampValue || extra.length > 0 || !Number.isFinite(timestamp)) return null
    if (timestamp > now || now - timestamp > TOKEN_MAX_AGE_MS) return null
    return id
  } catch {
    return null
  }
}
```

### 3.2 `villager-auth-client.ts` — Token 存储与读取（客户端）

**文件：** `apps/web/src/lib/villager-auth-client.ts`

```ts
const TOKEN_KEY = "villager_token"
const TOKEN_PREFIX = "villager_"
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function decodeVillagerToken(token: string, now = Date.now()) {
  if (!token.startsWith(TOKEN_PREFIX)) return null
  try {
    const decoded = atob(token.slice(TOKEN_PREFIX.length))
    const [id, timestampValue, ...extra] = decoded.split("_")
    const timestamp = Number(timestampValue)
    if (!id || !timestampValue || extra.length > 0 || !Number.isFinite(timestamp)) return null
    if (timestamp > now || now - timestamp > TOKEN_MAX_AGE_MS) return null
    return { id, timestamp }
  } catch { return null }
}

export function getVillagerSession() {
  if (typeof window === "undefined") return null
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const decoded = decodeVillagerToken(token)
  return decoded ? { ...decoded, token } : null
}

export function saveVillagerToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearVillagerToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export function fetchWithVillagerAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const session = getVillagerSession()
  const headers = new Headers(init.headers)
  if (session) headers.set("X-Villager-Token", session.token)
  return fetch(input, { ...init, headers })
}
```

### 3.3 `villager-portal.ts` — 类型定义

**文件：** `apps/web/src/lib/villager-portal.ts`

```ts
export interface VillagerSummary {
  id: string; name: string; skills: string[]; nodeId?: string
  node?: { id: string; slug: string; nameKey: string } | null
  status: string; taskSummary: TaskSummary; monthlyTaskSummary: TaskSummary
}
export interface TaskSummary { totalTasks: number; completedTasks: number; totalEarnings: number }
export interface VillagerTask {
  id: string; title: string; description?: string; taskType: string; status: string
  villagerId?: string; nodeId?: string; scheduledDate?: string; earnings: number
  createdAt: string; updatedAt: string; node?: { id: string; slug: string; nameKey: string } | null
}
export interface AppNotification {
  id: string; recipientType: string; recipientId: string; title: string; body: string
  channel: string; category: string; refType?: string; refId?: string
  isRead: boolean; createdAt: string; updatedAt: string
}
```

### 3.4 `interaction-tasks.ts` — 互动任务类型 + 积分

**文件：** `apps/web/src/lib/interaction-tasks.ts`

```ts
export const interactionTaskTypes = ["watering","fertilizing","photo_upload","diary","share"] as const
export type InteractionTaskType = (typeof interactionTaskTypes)[number]

const interactionPoints: Record<InteractionTaskType, number> = {
  watering: 10, fertilizing: 10, photo_upload: 15, diary: 20, share: 15,
}

export function isInteractionTaskType(value: unknown): value is InteractionTaskType {
  return typeof value === "string" && interactionTaskTypes.includes(value as InteractionTaskType)
}
export function getInteractionPoints(taskType: InteractionTaskType) { return interactionPoints[taskType] }
```

### 3.5 `interaction-generator.ts` — 互动任务生成器

**文件：** `apps/web/src/lib/interaction-generator.ts`

```ts
import { prisma } from "@zouma/database"
import type { InteractionTaskType } from "@web/lib/interaction-tasks"

interface InteractionTaskDraft {
  taskType: InteractionTaskType; title: string; description: string
}

export function buildInteractionTaskDrafts(harvestSeason: string | null): InteractionTaskDraft[] {
  const season = harvestSeason?.trim() || "当前生长季"
  return [
    ...Array.from({ length: 4 }, (_, i) => ({
      taskType: "watering" as const,
      title: `第 ${i + 1} 周浇水`,
      description: `${season}养护任务：完成本周浇水并记录树木状态。`,
    })),
    { taskType: "fertilizing", title: "本月施肥", description: `${season}养护任务：完成一次施肥并记录用量。` },
    { taskType: "photo_upload", title: "上传成长照片", description: `${season}养护任务：拍摄并上传一张果树成长照片。` },
    { taskType: "diary", title: "记录养护日记", description: `${season}养护任务：写下本月的果树变化与养护观察。` },
  ]
}

export async function generateInteractionTasks(adoptionId: string, treeId: string) {
  const existing = await prisma.visitorInteractionTask.findFirst({
    where: { adoptionId, status: "pending" }, select: { id: true },
  })
  if (existing) return { count: 0 }

  const tree = await prisma.orchardTree.findUnique({
    where: { id: treeId }, select: { harvestSeason: true },
  })
  if (!tree) throw new Error("Orchard tree not found")

  return prisma.visitorInteractionTask.createMany({
    data: buildInteractionTaskDrafts(tree.harvestSeason).map((task) => ({
      adoptionId, treeId, ...task,
    })),
  })
}
```

### 3.6 `notification-hooks.ts` — 通知工具函数

**文件：** `apps/web/src/lib/notification-hooks.ts`

```ts
export function shouldCreateReportNotification(existingReport: { id: string } | null) {
  return existingReport === null
}

export function collectActiveAdopterPhones(adoptions: Array<{ adopterPhone: string | null }>) {
  return Array.from(
    new Set(
      adoptions
        .map((a) => a.adopterPhone)
        .filter((phone): phone is string => typeof phone === "string" && phone.length > 0),
    ),
  )
}
```

### 3.7 `villager-page-metadata.ts` — 页面元数据辅助

**文件：** `apps/web/src/lib/villager-page-metadata.ts`

```ts
import { getTranslations } from "next-intl/server"

export async function villagerMetadata(namespace: string, key: string, locale: string) {
  const t = await getTranslations({ locale, namespace: "villagerSystem" })
  return {
    title: t(`metadata.${key}.title`),
    description: t(`metadata.${key}.description`),
  }
}
```

### 3.8 单元测试（3 个文件）

- `apps/web/src/lib/villager-auth.test.ts` — 测试 token 签发/校验/过期
- `apps/web/src/lib/interaction-generator.test.ts` — 测试生成 7 个任务
- `apps/web/src/lib/notification-hooks.test.ts` — 测试去重/报告通知判断
- `apps/web/src/lib/villager-auth-client.test.ts` — 测试客户端 token 解码
- `apps/web/src/lib/interaction-tasks.test.ts` — 测试积分映射

> 测试文件内容参考审查报告中的代码，此处不重复展开。

---

## 四、Phase 3 — 新增 API 路由

### 4.1 通知 API

**文件：** `apps/web/src/app/api/v1/notifications/route.ts`

完整代码（参考 `docs/villager-system-implementation.md` 3.1 节）：
- GET：支持 `recipientType`、`recipientId`、`isRead`、`category` 筛选，按 `createdAt desc`，limit 50
- POST：创建通知，必填 `recipientType`、`recipientId`、`title`、`body`、`category`
- PATCH：单条 `{id, isRead:true}` 或批量 `{markAllRead:true, recipientType, recipientId}`
- `normalizeRecipientId("tourist", phone)` → `maskPhone(phone)` 用于游客手机号脱敏匹配

### 4.2 村民认证 API

**文件：** `apps/web/src/app/api/v1/villager-auth/request-otp/route.ts`
- POST `{phone}` → 查找 active 村民 → 生成 6 位 OTP → 写入 `otpCode` + `otpExpiry`(5min) → 返回 `{success, otp}`

**文件：** `apps/web/src/app/api/v1/villager-auth/verify-otp/route.ts`
- POST `{phone, otp}` → 校验 phone + otp + expiry → 返回 `{token, villager}`

### 4.3 村民自助 API

**文件：** `apps/web/src/app/api/v1/villager/me/route.ts`
- GET：`X-Villager-Token` → `getVillagerIdFromToken` → 返回村民信息 + taskSummary

**文件：** `apps/web/src/app/api/v1/villager/me/tasks/route.ts`
- GET：返回该村民的任务列表（按 status 筛选）
- PATCH：村民更新任务状态（pending→accepted→in_progress→completed）

### 4.4 互动任务 API

**文件：** `apps/web/src/app/api/v1/interactions/route.ts`
- GET：`?adoptionId=&adopterPhone=&status=` → 校验所有权 → 返回任务列表
- POST：创建互动任务（需校验 adoption 所有权）
- PATCH：`{id, adopterPhone, status:"completed", note?, imageUrl?}` → 完成任务 + 积分

**文件：** `apps/web/src/app/api/v1/interactions/upload/route.ts`
- POST multipart/form-data：`file`+`adoptionId`+`adopterPhone` → 校验所有权 → 类型白名单(JPEG/PNG/WebP) → 5MB 限制 → 保存到 `public/uploads/trees/`

---

## 五、Phase 4 — 修改已有 API 路由

### 5.1 tree-adoptions/route.ts — 新增 PATCH + 激活通知

**文件：** `apps/web/src/app/api/v1/tree-adoptions/route.ts`

先在文件头部追加 import：
```ts
import { generateInteractionTasks } from "@web/lib/interaction-generator"
```

然后在现有 POST handler 之后追加 PATCH handler：

```ts
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid update" }, { status: 400 })
  }

  const existing = await prisma.treeAdoption.findUnique({ where: { id: body.id.trim() } })
  if (!existing) {
    return jsonResponse(request, { error: "Adoption not found" }, { status: 404 })
  }

  const validStatuses = ["pending_payment", "active", "completed", "cancelled"]
  const nextStatus =
    typeof body.status === "string" && validStatuses.includes(body.status)
      ? body.status : existing.status

  const data = await prisma.treeAdoption.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      ...(typeof body.adopterName === "string" ? { adopterName: body.adopterName.trim() || null } : {}),
      ...(typeof body.adopterPhone === "string" ? { adopterPhone: maskPhone(body.adopterPhone.trim()) ?? null } : {}),
    },
  })

  if (existing.status !== "active" && nextStatus === "active") {
    void generateInteractionTasks(data.id, data.treeId).catch((error) =>
      console.error("Failed to generate interaction tasks:", error),
    )
    void (async () => {
      const tree = await prisma.orchardTree.findUnique({
        where: { id: data.treeId }, select: { treeCode: true },
      })
      await prisma.notification.create({
        data: {
          recipientType: "tourist", recipientId: data.adopterPhone ?? "",
          title: "🎉 你的果树认养已激活",
          body: "现在可以开始浇水、施肥、拍照等互动任务。打开果树页面查看你的专属任务。",
          category: "tree", refType: "tree_adoption", refId: tree?.treeCode ?? data.treeId,
        },
      })
    })().catch((error) => console.error("Failed to create activation notification:", error))
  }

  return jsonResponse(request, {
    data: { id: data.id, status: data.status, updatedAt: data.updatedAt.toISOString() },
  })
}
```

### 5.2 tasks/route.ts — 任务分配→村民通知

**文件：** `apps/web/src/app/api/v1/tasks/route.ts`

在 POST handler 返回之前追加（`data.villagerId` 存在时）：

```ts
  if (data.villagerId) {
    void notifyVillagerTaskAssignment(data).catch((error) =>
      console.error("Failed to create task notification:", error),
    )
  }
```

在 PATCH handler 返回之前追加（改派给新村民时）：

```ts
  if (data.villagerId && data.villagerId !== existing.villagerId) {
    void notifyVillagerTaskAssignment(data).catch((error) =>
      console.error("Failed to create reassignment notification:", error),
    )
  }
```

在文件末尾追加 `notifyVillagerTaskAssignment` 函数：

```ts
async function notifyVillagerTaskAssignment(task: {
  id: string; title: string; description: string | null; villagerId: string | null
}) {
  if (!task.villagerId) return
  const existing = await prisma.notification.findFirst({
    where: { recipientType: "villager", recipientId: task.villagerId, refType: "task", refId: task.id },
    select: { id: true },
  })
  if (existing) return
  await prisma.notification.create({
    data: {
      recipientType: "villager", recipientId: task.villagerId,
      title: `📋 新任务：${task.title}`, body: task.description?.slice(0, 200) ?? "",
      category: "task", refType: "task", refId: task.id,
    },
  })
}
```

---

## 六、Phase 5 — 修改已有 lib 文件（集成钩子）

### 6.1 alert-engine.ts — 告警→通知

**文件：** `apps/web/src/lib/alert-engine.ts`

将 L11-L18 的 `alertTypeLabel` 提取为模块级常量（已是）。

在 `createAlertIfAbsent` 函数中，`prisma.alert.create` 成功后、`return alert` 之前，追加 fire-and-forget 通知（注意：`if (existing) return existing` 的提前返回已经保证了只有新告警才会执行到这里，天然去重）：

```ts
  void prisma.notification.create({
    data: {
      recipientType: "operator", recipientId: "all",
      title: `${alert.severity === "high" ? "🔴" : "🟡"} ${alertTypeLabel[alert.alertType] ?? alert.alertType}`,
      body: alert.message, category: "alert", refType: "alert", refId: alert.id,
    },
  }).catch((error) => console.error("Failed to create alert notification:", error))
```

### 6.2 care-advisor.ts — 养护建议→通知

**文件：** `apps/web/src/lib/care-advisor.ts`

在 `generateCareAdvice` 中，AI 返回结果后（非 fallback 时），调用 `notifyActiveAdopters`：

```ts
import { collectActiveAdopterPhones } from "@web/lib/notification-hooks"

async function notifyActiveAdopters(content: string) {
  const activeAdoptions = await prisma.treeAdoption.findMany({
    where: { status: "active" }, select: { adopterPhone: true }, distinct: ["adopterPhone"],
  })
  const phones = collectActiveAdopterPhones(activeAdoptions)
  await Promise.allSettled(
    phones.map((phone) =>
      prisma.notification.create({
        data: {
          recipientType: "tourist", recipientId: phone,
          title: "🌳 你的果园本周有新的养护建议", body: content.slice(0, 300), category: "tree",
        },
      }),
    ),
  )
}
```

### 6.3 report-generator.ts — 日报→通知

**文件：** `apps/web/src/lib/report-generator.ts`

在 `generateDailyReport` 中，upsert 日报成功后：

```ts
  if (shouldCreateReportNotification(existingReport)) {
    void prisma.notification.create({
      data: {
        recipientType: "operator", recipientId: "all",
        title: `📊 运营日报已生成（${date}）`, body: parsed.summary.slice(0, 200),
        category: "report", refType: "report", refId: date,
      },
    }).catch((error) => console.error("Failed to create report notification:", error))
  }
```

---

## 七、Phase 6 — 前端组件

### 7.1 notification-bell.tsx — 浮动通知铃铛

**文件：** `apps/web/src/components/notification-bell.tsx`

- `"use client"` 组件
- 从 `localStorage.getItem("tourist_phone")` 获取手机号，取不到返回 null
- `position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 50`
- 每 30 秒轮询 `GET /api/v1/notifications?recipientType=tourist&recipientId={phone}&isRead=false`
- 未读数 > 99 显示 "99+"，红色角标
- 点击跳转 `/[locale]/me/notifications`
- 使用 `lucide-react` 的 `Bell` 图标
- 使用 `useTranslations("villagerSystem")`

### 7.2 interaction-panel.tsx — 互动任务面板

**文件：** `apps/web/src/components/interaction-panel.tsx`

- `"use client"` 组件
- Props: `{ treeId: string; treeCode: string }`
- 从 localStorage 读 `tourist_phone` → 查活跃认养 → 加载 pending 互动任务
- 5 种任务类型：watering(Droplets) / fertilizing(Leaf) / photo_upload(Camera) / diary(NotebookPen) / share(Share2)
- 每种任务有对应的图标、描述、积分
- 完成操作：浇水/施肥/日记 → 确认按钮；拍照 → 文件上传；分享 → clipboard.writeText
- 完成后调用 `PATCH /api/v1/interactions`，刷新列表

---

## 八、Phase 7 — 前端页面

### 8.1 村民轻门户（7 个文件）

| 文件 | 说明 |
|---|---|
| `[locale]/villager/layout.tsx` | `"use client"`，校验 token，底部 TabBar |
| `[locale]/villager/login/page.tsx` | `"use client"`，引入 VillagerLoginClient |
| `[locale]/villager/login/villager-login-client.tsx` | 手机号输入 → OTP 获取 → 验证 → 跳转 dashboard |
| `[locale]/villager/dashboard/page.tsx` | `"use client"`，引入 VillagerDashboardClient |
| `[locale]/villager/dashboard/villager-dashboard-client.tsx` | 姓名+技能标签+统计卡片+最近任务/通知 |
| `[locale]/villager/tasks/page.tsx` | `"use client"`，引入 VillagerTasksClient |
| `[locale]/villager/tasks/villager-tasks-client.tsx` | 按状态 Tab 切换，展开详情+状态流转按钮 |
| `[locale]/villager/earnings/page.tsx` | `"use client"`，引入 VillagerEarningsClient |
| `[locale]/villager/earnings/villager-earnings-client.tsx` | 累计/本月收益+趋势柱状图+已完成任务列表 |
| `[locale]/villager/notifications/page.tsx` | `"use client"`，引入 VillagerNotificationsClient |
| `[locale]/villager/notifications/villager-notifications-client.tsx` | 通知列表+已读标记+全部已读+任务跳转 |
| `[locale]/villager/error.tsx` | 错误边界 |
| `[locale]/villager/loading.tsx` | 加载状态 |

### 8.2 游客通知中心（2 个文件）

| 文件 | 说明 |
|---|---|
| `[locale]/me/notifications/page.tsx` | 引入 TouristNotificationCenter |
| `[locale]/me/notifications/tourist-notification-center.tsx` | 通知列表+分类筛选(tree/activity)+已读标记+全部已读 |

### 8.3 修改已有页面

**`[locale]/layout.tsx`** — 在 `{children}` 后追加 `<NotificationBell />`：
```tsx
import { NotificationBell } from "@web/components/notification-bell"
// ...
<NextIntlClientProvider messages={messages}>
  {children}
  <NotificationBell />
</NextIntlClientProvider>
```

**`[locale]/trees/[code]/page.tsx`** — 在养护日志区域后引入 `<InteractionPanel treeCode={tree.treeCode} treeId={tree.id} />`。

**三处流程文件各加一行** `localStorage.setItem("tourist_phone", phone.trim())`：
- `trees/adoption-flow.tsx` — 认养提交后
- `booking/booking-flow.tsx` — 预约提交后
- `tickets/ticket-flow.tsx` — 购票提交后

**`[locale]/page.tsx`** — Header 导航加村民入口链接：
```tsx
<Link className="transition hover:text-white" href={`/${params.locale}/villager/login`}>
  {t("quickActions.villager")}
</Link>
```

---

## 九、Phase 8 — i18n 翻译

在 `zh-CN.json`、`en.json`、`ja.json` 中追加 `villagerSystem` 命名空间（参考 `docs/villager-system-implementation.md` 中的完整翻译），并在 `home.quickActions` 中追加 `"villager"` 键。

---

## 十、Phase 9 — 启动脚本

- 覆盖 `start.bat`：双击启动 → `chcp 65001` → `powershell -NoExit -ExecutionPolicy Bypass -File start.ps1`
- 覆盖 `start.sh`：Bash/Mac 版（含 Prisma generate + 健康检测 + migrate deploy）
- 新建 `start.ps1`：Windows PowerShell 版（完整 6 步流程 + `Invoke-Native` 错误抑制）

---

## 十一、验证清单

- [ ] `pnpm install` 无报错
- [ ] `npx prisma generate` 无报错
- [ ] `npx prisma migrate deploy` 无报错
- [ ] `pnpm turbo dev` 前台 :3000 + 后台 :3001 正常启动
- [ ] 访问 `/zh-CN/villager/login` — 村民登录页可见
- [ ] 访问 `/zh-CN/me/notifications` — 游客通知中心可见
- [ ] 访问 `/zh-CN/trees` → 认养流程 → localStorage 写入 tourist_phone
- [ ] 首页右下角出现通知铃铛
- [ ] 树详情页出现互动面板（需活跃认养）
- [ ] 管理员后台创建任务分配给村民 → 村民通知生成
- [ ] 触发告警 → 运营通知生成
- [ ] 手动调用日报生成 → 日报通知生成
- [ ] 修改认养状态为 active → 互动任务生成 + 激活通知生成
