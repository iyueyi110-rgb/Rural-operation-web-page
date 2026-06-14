# 走马村 AIGC 云脑 P3 — 云脑六大模块补全 执行指令

## 架构约束

- 在现有 `d:\1\AIGC` monorepo 中扩展
- 前台 web / 后台 admin 现有功能零破坏
- 所有新增为增量
- P3 聚焦：**村民模型 + 农事日历 + AI 内容工厂 + 代摘代寄 + 任务调度**

---

## P3 总体验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 村民可管理 | Admin CRUD Villager → 列表展示 |
| 2 | 农事日历前台可见 | `/calendar` 页面按节气展示农事活动 |
| 3 | AI 可生成导览词/活动脚本/社交文案 | Admin 选择类型→生成→结果展示 |
| 4 | 代摘代寄流程走通 | 前台认养树→预约代摘+代寄→Admin 跟踪物流 |
| 5 | 任务可分配给村民 | Admin 创建任务→选择村民→状态流转 |
| 6 | 收益统计可按村民查看 | Admin `/villagers` 查看每人任务收益汇总 |

---

## P3.0：村民模型（核心依赖）

> 1、4、6 三个模块的缺口都指向"村民"角色缺失，先建村民模型。

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 0.1 | Villager 表存在 | `prisma db push` → `villager` 表 |
| 0.2 | Admin CRUD | `/villagers` 页面可增删改查村民 |
| 0.3 | 村民关联节点 | 村民可绑定到 SpaceNode（工作区域） |

### Schema

```prisma
model Villager {
  id        String   @id @default(cuid())
  name      String
  phone     String
  skills    Json     @default("[]")  // ["cooking", "farming", "guiding", "handicraft"]
  nodeId    String?
  status    String   @default("active")  // active | inactive
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  node      SpaceNode? @relation(fields: [nodeId], references: [id])
  tasks     Task[]

  @@map("villager")
}
```

### Contracts

```ts
export interface VillagerData {
  id: string
  name: string
  phone: string
  skills: string[]
  nodeId?: string
  status: "active" | "inactive"
  createdAt: string
}
```

### API

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/villagers` | GET | 村民列表 |
| `POST /api/v1/villagers` | POST | 创建村民（Admin，X-Admin-Token） |
| `PATCH /api/v1/villagers` | PATCH | 编辑村民 |
### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/villagers/page.tsx` | 村民列表 + 新建/编辑表单 + 技能标签 + 收益汇总 |
| 修改 `apps/admin/src/components/admin-sidebar.tsx` | 新增菜单 `villagers: "村民管理"`，图标 `Users` |
| 修改 `apps/admin/src/lib/admin-copy.ts` | 新增 `villagers` 文案 |

### 前台

> 村民模型本身是后台管理的，前台不需要村民列表页面。
> 前台只需要在认养/采摘环节可看到"由哪位村民负责"的信息展示。

---

## P3.1：农事日历

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1.1 | 农事日历可管理 | Admin CRUD → 列表展示 |
| 1.2 | 前台按节气展示 | `/calendar` 页面展示农事时间线 |
| 1.3 | 与树/活动关联 | 农事条目可关联到 OrchardTree 或 CourtyardActivity |

### Schema

```prisma
model FarmingCalendar {
  id          String   @id @default(cuid())
  solarTerm   String   // 立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒
  title       String
  description String   @db.Text
  activityType String   // planting | pruning | fertilizing | harvesting | processing | festival
  startDate   String   // YYYY-MM-DD
  endDate     String?
  treeSpecies String?  // 关联的树种（lychee/longan）
  status      String   @default("upcoming")  // upcoming | active | completed
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([startDate])
  @@map("farming_calendar")
}
```

### Contracts

```ts
export type SolarTerm = "立春"|"雨水"|"惊蛰"|"春分"|"清明"|"谷雨"|"立夏"|"小满"|"芒种"|"夏至"|"小暑"|"大暑"|"立秋"|"处暑"|"白露"|"秋分"|"寒露"|"霜降"|"立冬"|"小雪"|"大雪"|"冬至"|"小寒"|"大寒"

export interface FarmingCalendarData {
  id: string
  solarTerm: SolarTerm
  title: string
  description: string
  activityType: string
  startDate: string
  endDate?: string
  treeSpecies?: string
  status: "upcoming" | "active" | "completed"
}
```

### API

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/farming-calendar?status=X&from=Y&to=Z` | GET | 农事列表（前台+Admin 共用） |
| `POST /api/v1/farming-calendar` | POST | 创建农事（Admin） |
| `PATCH /api/v1/farming-calendar` | PATCH | 编辑农事（Admin） |

### 前台

| 文件 | 改动 |
|------|------|
| 新建 `apps/web/src/app/[locale]/calendar/page.tsx` | 农事日历页：按节气时间线展示农事活动 |
| 新建 `apps/web/src/app/[locale]/calendar/farming-calendar.tsx` | 日历组件：节气列表 + 筛选（树种/类型/状态） |
| 修改 i18n（zh-CN/en/ja） | 新增 `calendar` 命名空间 + 24 节气名 |

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/farming/page.tsx` | 农事日历管理：列表 + 新建/编辑 |
| 修改 sidebar + admin-copy | 新增菜单 `farming: "农事日历"`，图标 `Sunrise` |

---

## P3.2：AI 内容工厂

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 2.1 | 可选择内容类型生成 | Admin 下拉选类型→点生成→返回 AI 文本 |
| 2.2 | 三种类型可用 | 导览词/活动脚本/社交文案 |
| 2.3 | 生成结果可编辑复制 | 文本框可编辑 + 一键复制按钮 |

### API

| 端点 | 方法 | 功能 |
|------|------|------|
| `POST /api/v1/ai/generate-content` | POST | AI 内容生成。请求体：`{ type: "narration"|"script"|"social", scene?: string, activity?: string, season?: string }` |

**实现**：`apps/web/src/app/api/v1/ai/generate-content/route.ts`

```ts
// 根据 type 选择不同的 system prompt 模板
// narration → "你是走马村导览讲解撰写助手..."
// script → "你是走马村活动主持脚本撰写助手..."
// social → "你是走马村社交媒体运营文案撰写助手..."
// 调用 ModelProviderAdapter.complete()
// 返回 { data: { content, type, model, latencyMs } }
```

### 新建 `packages/prompts/content-factory.ts`

```ts
export const CONTENT_PROMPTS = {
  narration: "你是走马村「云脉寿岭·荔水走马」导览讲解撰写助手。根据场景信息，撰写一段 200-400 字的导览讲解词，语言生动、有故事感、适合语音导览播放。",
  script: "你是走马村乡村活动主持脚本撰写助手。根据活动信息，撰写一段包含开场、互动环节、结束语的主持脚本，适合村宴/食育课/研学工坊使用。",
  social: "你是走马村社交媒体运营文案撰写助手。根据季节和活动信息，撰写一条适合微信/小红书发布的推广文案，含标题+正文+话题标签，100-200 字。",
} as const
```

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/content-factory/page.tsx` | AI 内容工作台：类型选择→参数表单→生成按钮→结果编辑区→复制按钮→历史记录列表 |
| 修改 sidebar + admin-copy | 新增菜单 `contentFactory: "内容工厂"`，图标 `PenTool` |

### 可选：存储生成历史

如果后续需要历史记录，可建 `AIGeneratedContent` 模型（type/content/params/createdAt）。P3 不做数据库存储，仅实时生成。

---

## P3.3：代摘代寄

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 3.1 | 前台可预约代摘+代寄 | 认养树→选"代摘代寄"→填收货信息→下单 |
| 3.2 | Admin 可跟踪物流 | 录入快递单号→状态变更→前台可见 |
| 3.3 | 认养人可查看物流 | "我的认养"页面展示代寄物流状态 |

### Schema

```prisma
model HarvestShipment {
  id              String          @id @default(cuid())
  harvestBookingId String         @unique
  recipientName   String
  recipientPhone  String
  recipientAddress String         @db.Text
  courier         String?         // 快递公司
  trackingNumber  String?         // 快递单号
  status          String          @default("pending")  // pending | picking | shipping | delivered
  shippedAt       DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  harvestBooking  HarvestBooking  @relation(fields: [harvestBookingId], references: [id])

  @@map("harvest_shipment")
}
```

### Contracts

```ts
export interface HarvestShipmentData {
  id: string
  harvestBookingId: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  courier?: string
  trackingNumber?: string
  status: "pending" | "picking" | "shipping" | "delivered"
  shippedAt?: string
  deliveredAt?: string
}
```

### API

| 端点 | 方法 | 功能 |
|------|------|------|
| `POST /api/v1/harvest-shipments` | POST | 创建代寄单（前台认养人选"代摘代寄"时调用） |
| `GET /api/v1/harvest-shipments?harvestBookingId=X` | GET | 查询代寄单 |
| `PATCH /api/v1/harvest-shipments` | PATCH | 更新物流信息（Admin，X-Admin-Token） |

### 前台

| 文件 | 改动 |
|------|------|
| `apps/web/src/app/[locale]/trees/[code]/page.tsx` | 认养流程增加"代摘代寄"选项：勾选→显示收货信息表单（姓名/电话/地址） |
| `apps/web/src/app/[locale]/me/adoption-lookup.tsx` | 认养详情中展示代寄物流状态（pending→采摘中→运输中→已送达） |

### Admin

| 文件 | 改动 |
|------|------|
| `apps/admin/src/app/harvest/page.tsx` | 采摘管理增加物流录入：选择订单→填写快递公司+单号→状态变更 |

---

## P3.4：任务调度

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 4.1 | 任务可创建 | Admin 创建任务（类型+描述+截止时间） |
| 4.2 | 可分配给村民 | 下拉选择村民→分配 |
| 4.3 | 状态可流转 | pending→accepted→in_progress→completed |
| 4.4 | 收益统计 | 村民详情页展示完成任务数+总收益 |

### Schema

```prisma
model Task {
  id          String    @id @default(cuid())
  taskType    String    // harvest | care | kitchen | guide | workshop | logistics
  title       String
  description String?   @db.Text
  assignedTo  String?   // Villager.id
  earnings    Float?    // 该任务的村民收益
  status      String    @default("pending")  // pending | accepted | in_progress | completed | cancelled
  dueDate     String?
  completedAt DateTime?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  villager    Villager? @relation(fields: [assignedTo], references: [id])

  @@index([assignedTo, status])
  @@map("task")
}
```

### Contracts

```ts
export interface TaskData {
  id: string
  taskType: "harvest" | "care" | "kitchen" | "guide" | "workshop" | "logistics"
  title: string
  description?: string
  assignedTo?: string
  earnings?: number
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  dueDate?: string
  completedAt?: string
}
```

### API

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/tasks?status=X&assignedTo=Y` | GET | 任务列表 |
| `POST /api/v1/tasks` | POST | 创建任务（Admin） |
| `PATCH /api/v1/tasks` | PATCH | 更新任务状态/分配村民 |
| `GET /api/v1/villagers/[id]/tasks` | GET | 某村民的任务列表+收益汇总 |

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/tasks/page.tsx` | 任务看板：列表 + 筛选（类型/村民/状态）+ 新建/分配 + 状态按钮 |
| 修改 sidebar + admin-copy | 新增菜单 `tasks: "任务调度"`，图标 `ClipboardCheck` |

### Villagers 页面的收益统计

`apps/admin/src/app/villagers/page.tsx` 中，选中村民时：
- `GET /api/v1/villagers/[id]/tasks` → 汇总 `_sum.earnings` + 按状态分组计数

---

## P3.5：收益统计看板

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 5.1 | 村民收益排行 | `/villagers` 页面展示每个村民的总收益+完成任务数 |
| 5.2 | 收益汇总纳入日报 | 日报 metrics 新增 `villagerEarnings` 汇总 |
| 5.3 | 任务完成统计 | 按 taskType 分组展示完成数 |

### 改动

- `apps/admin/src/app/villagers/page.tsx`：增加收益汇总卡片行
- `apps/web/src/lib/report-generator.ts`：日报 context 追加 `villagerStats`（当日任务完成数+总收益）

---

## 执行顺序

```
P3.0 村民模型     (核心依赖，先建)
    ↓
P3.1 农事日历     (独立)
    ↓
P3.3 代摘代寄     (独立)
    ↓
P3.4 任务调度     (依赖 P3.0 村民模型)
    ↓
P3.2 AI 内容工厂  (独立，使用已有 ModelProviderAdapter)
    ↓
P3.5 收益统计     (依赖 P3.0 + P3.4)
```

---

## Admin 菜单总览（P3 完成后）

```
云脑总览     /dashboard
反馈管理     /feedback
节点管理     /nodes
消费订单     /orders
树木管理     /trees
采摘管理     /harvest
活动管理     /activities
告警中心     /alerts
交叉分析     /analytics
村民管理     /villagers    ← P3.0
农事日历     /farming      ← P3.1
内容工厂     /content-factory ← P3.2
任务调度     /tasks        ← P3.4
运营日报     /reports
地图监控     /map
设施调度     /infrastructure
设备管理     /devices
产品管理     /products
系统设置     /settings
```

---

## 完整验证流程

```bash
# 1. 数据库
cd packages/database && npx prisma db push
# → 验收: villager/farming_calendar/harvest_shipment/task 表存在

# 2. Type check
cd apps/web && pnpm type-check && cd ../admin && pnpm type-check
# → 零错误

# 3. 前台 (:3000)
# → 新增 /calendar 农事日历页
# → 树详情页增加"代摘代寄"选项
# → 我的认养增加物流追踪

# 4. 后台 (:3001)
# → 新增 /villagers 村民管理（CRUD+收益统计）
# → 新增 /farming 农事日历管理
# → 新增 /content-factory AI 内容工作台
# → 新增 /tasks 任务调度看板
# → /harvest 增加物流录入

# 5. API
# → POST /api/v1/villagers → 201
# → POST /api/v1/farming-calendar → 201
# → POST /api/v1/ai/generate-content → 返回 AI 文本
# → POST /api/v1/harvest-shipments → 201
# → POST /api/v1/tasks → 201
```
