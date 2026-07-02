# 互动任务系统 — Codex 执行计划与注意事项

> **文档用途**：给 Codex（或执行开发的 AI Agent）的完整实施计划。
> **项目**：走马村「云脉寿岭·荔水走马」AIGC 云脑系统
> **环节**：认养一棵树 → 互动任务系统
> **日期**：2026-07-01
> **当前状态**：已有基础版 `VisitorInteractionTask` 模型 + 简单交互面板，需升级为完整互动系统。

---

## 一、现状分析 (What Exists)

### 1.1 已有代码资产

| 层次 | 文件 | 现有能力 |
|------|------|----------|
| **数据模型** | `packages/database/prisma/schema.prisma` → `VisitorInteractionTask` | 单次任务记录：taskType / status(pending,completed,expired) / points / imageUrl / note |
| **任务类型** | `apps/web/src/lib/interaction-tasks.ts` | 5 种任务类型：watering(10分) / fertilizing(10分) / photo_upload(15分) / diary(20分) / share(15分) |
| **任务生成** | `apps/web/src/lib/interaction-generator.ts` | 认养后自动生成 7 个任务（4浇水+1施肥+1拍照+1日记），注意：**缺少 share 任务** |
| **前端面板** | `apps/web/src/components/interaction-panel.tsx` | 树详情页内的简单任务列表，逐个完成 |
| **API** | `apps/web/src/app/api/v1/interactions/route.ts` | GET(查询) / POST(手动创建) / PATCH(完成) |
| **i18n** | `apps/web/messages/zh-CN.json` → `villagerSystem.interactions` | 基础文案（标题/描述/按钮） |

### 1.2 现有痛点

1. **没有独立的互动系统页面** — 目前只是一个嵌在树详情页的面板
2. **没有积分汇总与兑换** — 积分只记录在单条任务上，无用户维度的总分/兑换
3. **没有任务重复周期** — 浇水×4 是写死在生成器里的，不是动态周期（每周/每月刷新）
4. **没有进度可视化** — 无时间线、无完成率、无连续打卡
5. **缺少分享任务** — `buildInteractionTaskDrafts` 没有生成 share 类型任务
6. **没有季节性事件** — 与 `FarmingCalendar`（农事日历）未联动
7. **没有系统提醒** — 无推送/通知机制告知用户有新任务
8. **后台无监控** — 管理后台看不到互动数据

---

## 二、目标设计 (What to Build)

### 2.1 核心功能

```
互动任务系统
├── 任务列表（含重复次数 & 周期刷新）
│   ├── 浇水    10分 × 4次/月
│   ├── 施肥    10分 × 1次/月
│   ├── 拍照上传 15分 × 1次/月
│   ├── 养护日记 20分 × 1次/月
│   └── 分享    15分 × 1次/月
├── 积分中心
│   ├── 总积分展示
│   ├── 积分明细（来源/日期）
│   └── 积分兑换（兑换权益/优惠券占位）
├── 进度可视化
│   ├── 月度完成环形图
│   ├── 养护时间线
│   └── 连续打卡天数
├── 季节性事件
│   └── 与 FarmingCalendar 联动（如"芒种特别任务"）
├── 系统提醒
│   └── 任务到期 / 新任务可用 / 季节事件通知
└── 入口
    ├── 树详情页（现有 interaction-panel 升级为入口卡片）
    ├── 用户中心 → "我的互动"
    └── 首页认养模块
```

### 2.2 用户流程

```
认养成功 → 自动生成当月任务包
         → 用户收到通知"你的养护任务已就绪"
         → 进入「互动任务系统」查看任务列表
         → 完成任务获得积分
         → 查看积分累计 & 养护时间线
         → 月底任务刷新 / 季节事件触发新任务
         → 积分兑换权益
```

---

## 三、分阶段执行计划

### Phase 1：数据库 Schema 升级

**文件**：`packages/database/prisma/schema.prisma`

#### 1.1 增强 `VisitorInteractionTask`

```prisma
model VisitorInteractionTask {
  id            String    @id @default(cuid())
  adoptionId    String
  treeId        String
  taskType      String    // watering | fertilizing | photo_upload | diary | share
  title         String
  description   String?   @db.Text
  status        String    @default("pending") // pending | completed | expired
  // 新增字段
  periodKey     String?   // 周期标识，如 "2026-07" 表示2026年7月任务包
  maxCompletions Int      @default(1) // 该周期内最多完成次数
  completionCount Int     @default(0) // 当前周期已完成次数
  pointsPerCompletion Int  @default(0) // 每次完成获得积分
  totalPointsEarned Int   @default(0) // 该任务累计获得积分
  seasonEventId String?   // 关联的季节事件 ID（可选）
  completedAt   DateTime?
  imageUrl      String?
  note          String?   @db.Text
  points        Int       @default(0) // 保留兼容，等于 totalPointsEarned
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  adoption      TreeAdoption @relation(fields: [adoptionId], references: [id])
  tree          OrchardTree  @relation(fields: [treeId], references: [id])
  seasonEvent   SeasonEvent? @relation(fields: [seasonEventId], references: [id])

  @@index([adoptionId, periodKey, status])
  @@index([adoptionId, taskType, periodKey])
  @@index([treeId, createdAt])
  @@map("visitor_interaction_task")
}
```

#### 1.2 新增模型 `UserPoints`

```prisma
model UserPoints {
  id          String   @id @default(cuid())
  userId      String   // User.id
  totalPoints Int      @default(0) // 累计总积分
  availablePoints Int   @default(0) // 可用积分（总积分 - 已兑换）
  redeemedPoints Int    @default(0) // 已兑换积分
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id])

  @@unique([userId])
  @@map("user_points")
}
```

#### 1.3 新增模型 `PointsTransaction`

```prisma
model PointsTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int      // 正数=获得，负数=兑换消耗
  type        String   // earn | redeem | expire | adjust
  source      String   // watering | fertilizing | photo_upload | diary | share | season_event | redeem | admin_adjust
  referenceId String?  // 关联的任务 ID 或兑换记录 ID
  note        String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([userId, type])
  @@map("points_transaction")
}
```

#### 1.4 新增模型 `SeasonEvent`

```prisma
model SeasonEvent {
  id          String   @id @default(cuid())
  solarTerm   String   // 关联节气：立春/雨水/.../大寒（与 FarmingCalendar.solarTerm 对应）
  title       String
  description String?  @db.Text
  taskType    String   // 互动任务类型
  bonusPoints Int      @default(0) // 额外奖励积分
  startDate   DateTime
  endDate     DateTime
  imageUrl    String?
  status      String   @default("active") // active | ended
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tasks       VisitorInteractionTask[]

  @@index([startDate, endDate, status])
  @@map("season_event")
}
```

#### 1.5 新增模型 `RedemptionOption`

```prisma
model RedemptionOption {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text
  pointsCost  Int      // 所需积分
  type        String   // coupon | rights | physical | digital
  stock       Int      @default(-1) // -1=无限
  redeemedCount Int    @default(0)
  imageUrl    String?
  status      String   @default("active") // active | inactive
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("redemption_option")
}
```

#### 1.6 新增模型 `RedemptionRecord`

```prisma
model RedemptionRecord {
  id            String   @id @default(cuid())
  userId        String
  optionId      String
  pointsSpent   Int
  status        String   @default("pending") // pending | fulfilled | cancelled
  note          String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  fulfilledAt   DateTime?

  user          User              @relation(fields: [userId], references: [id])
  option        RedemptionOption  @relation(fields: [optionId], references: [id])

  @@index([userId, createdAt])
  @@map("redemption_record")
}
```

#### 1.7 给 `User` 模型增加关联

在 `User` 模型中添加：
```prisma
  pointsAccount   UserPoints?
  pointsTransactions PointsTransaction[]
  redemptionRecords  RedemptionRecord[]
```

> ⚠️ **注意**：Prisma 迁移后需执行 `pnpm db:push` 或 `prisma migrate dev`。

---

### Phase 2：API 契约类型

**文件**：`packages/contracts/src/index.ts`

新增类型定义：

```ts
// 互动任务系统
export interface InteractionTaskData {
  id: string
  adoptionId: string
  treeId: string
  taskType: InteractionTaskType
  title: string
  description?: string
  status: 'pending' | 'completed' | 'expired'
  periodKey?: string
  maxCompletions: number
  completionCount: number
  pointsPerCompletion: number
  totalPointsEarned: number
  seasonEventId?: string
  completedAt?: string
  imageUrl?: string
  note?: string
  points: number
  createdAt: string
  updatedAt: string
}

export type InteractionTaskType =
  | 'watering'
  | 'fertilizing'
  | 'photo_upload'
  | 'diary'
  | 'share'

export interface InteractionTaskSummary {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalPointsEarned: number
  tasksByType: Record<InteractionTaskType, { total: number; completed: number }>
}

export interface UserPointsData {
  totalPoints: number
  availablePoints: number
  redeemedPoints: number
}

export interface PointsTransactionData {
  id: string
  amount: number
  type: 'earn' | 'redeem' | 'expire' | 'adjust'
  source: string
  referenceId?: string
  note?: string
  createdAt: string
}

export interface SeasonEventData {
  id: string
  solarTerm: string
  title: string
  description?: string
  taskType: InteractionTaskType
  bonusPoints: number
  startDate: string
  endDate: string
  imageUrl?: string
  status: 'active' | 'ended'
}

export interface RedemptionOptionData {
  id: string
  title: string
  description?: string
  pointsCost: number
  type: 'coupon' | 'rights' | 'physical' | 'digital'
  stock: number
  redeemedCount: number
  imageUrl?: string
  status: 'active' | 'inactive'
}

export interface RedemptionRecordData {
  id: string
  userId: string
  optionId: string
  pointsSpent: number
  status: 'pending' | 'fulfilled' | 'cancelled'
  note?: string
  createdAt: string
  fulfilledAt?: string
}
```

---

### Phase 3：后端 API 路由

#### 3.1 增强现有 `/api/v1/interactions/route.ts`

**改动点**：
- GET：返回 `periodKey`、`maxCompletions`、`completionCount`、`totalPointsEarned` 等新字段
- GET：支持 `periodKey` 查询参数（查询特定月份的任务包）
- GET：新增 `/api/v1/interactions/summary` 端点，返回 `InteractionTaskSummary`
- PATCH：支持 `completionCount` 递增（同一任务可多次完成）
- PATCH：完成后自动触发积分入账（`PointsTransaction` + 更新 `UserPoints`）
- POST：支持周期性任务包创建（指定 `periodKey`）

#### 3.2 新建 `/api/v1/interactions/periodic/route.ts`

```
POST /api/v1/interactions/periodic
- 为指定认养生成新月度任务包
- 根据 periodKey 去重（同月不重复生成）
- 包含 4×浇水 + 1×施肥 + 1×拍照 + 1×日记 + 1×分享
```

#### 3.3 新建 `/api/v1/interactions/seasonal/route.ts`

```
GET  /api/v1/interactions/seasonal — 获取当前活跃的季节事件
POST /api/v1/interactions/seasonal — 为符合条件的认养用户生成季节任务
```

#### 3.4 新建 `/api/v1/points/route.ts`

```
GET    /api/v1/points?userId=xxx          — 查询用户积分余额
GET    /api/v1/points/transactions?userId=xxx — 查询积分明细（支持分页）
```

#### 3.5 新建 `/api/v1/points/redeem/route.ts`

```
GET    /api/v1/points/redeem            — 获取可兑换选项列表
POST   /api/v1/points/redeem            — 发起兑换
GET    /api/v1/points/redeem/history    — 兑换记录
```

#### 3.6 新建定时任务

**文件**：`apps/web/src/app/api/v1/cron/interaction-refresh/route.ts`

- 每月 1 号自动为所有 active 认养生成新月度任务包
- 过期上月未完成任务（status → expired）
- 可被 Vercel Cron Jobs 或外部 cron 服务调用

---

### Phase 4：前端页面 & 组件

#### 4.1 新建独立互动系统页面

**路由**：`/me/interactions`

**文件**：
```
apps/web/src/app/[locale]/me/interactions/
├── page.tsx                    # 服务端页面入口
├── interaction-dashboard.tsx   # "use client" 主仪表盘组件
├── task-list.tsx               # 任务列表卡片（含重复次数显示）
├── task-card.tsx               # 单个任务卡片
├── points-summary.tsx          # 积分汇总环形图
├── timeline.tsx                # 养护时间线
├── season-banner.tsx           # 季节事件横幅
├── redemption-panel.tsx        # 积分兑换面板
└── redemption-card.tsx         # 兑换选项卡片
```

#### 4.2 页面布局设计

```
┌──────────────────────────────────────────────┐
│  ← 返回    互动任务系统                      │
├──────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ 总积分   │  │ 本月完成  │  │ 连续打卡   │  │
│  │  85 分   │  │  5 / 8   │  │  12 天     │  │
│  └─────────┘  └──────────┘  └────────────┘  │
├──────────────────────────────────────────────┤
│  🌾 芒种特别任务 — 上传荔枝花照片 +20分     │  ← 季节横幅
├──────────────────────────────────────────────┤
│  养护任务 (2026年7月)                        │
│  ┌──────────────────────────────────────┐    │
│  │ 💧 浇水  10分/次  ▨▨▨□ 3/4 次      │    │
│  │    [完成任务]                        │    │
│  ├──────────────────────────────────────┤    │
│  │ 🌿 施肥  10分/次  ▨□ 1/1 次  ✅    │    │
│  ├──────────────────────────────────────┤    │
│  │ 📷 拍照上传  15分/次  □ 0/1 次      │    │
│  ├──────────────────────────────────────┤    │
│  │ 📝 养护日记  20分/次  □ 0/1 次      │    │
│  ├──────────────────────────────────────┤    │
│  │ 🔗 分享  15分/次  □ 0/1 次          │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│  养护时间线                                  │
│  ○ 7/1  完成浇水                             │
│  ○ 6/28 完成施肥                             │
│  ○ 6/21 上传成长照片                         │
│  ...                                         │
├──────────────────────────────────────────────┤
│  积分兑换                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 荔枝蜜    │  │ 认养折扣  │  │ 采摘券   │   │
│  │ 50 分    │  │ 100 分   │  │ 80 分    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────┘
```

#### 4.3 升级现有组件

**`interaction-panel.tsx`** → 改为互动系统的**入口卡片**：
- 显示本月完成进度（环形图）
- "进入互动系统"按钮 → 跳转 `/me/interactions`
- 快速完成（浇水/拍照）按钮

**`adoption-flow.tsx`** → 认养成功后：
- 弹窗提示"互动任务已开启"
- 引导用户前往互动系统

#### 4.4 新增入口点

| 位置 | 入口形式 |
|------|----------|
| 树详情页 `trees/[code]` | 升级后的 interaction-panel（带进度环） |
| 用户中心 `/me` | "我的互动"卡片 → `/me/interactions` |
| 首页认养模块 | 积分/任务徽章（如有活跃认养） |
| 导航栏 | 认养用户可见"互动"图标 |

#### 4.5 关键交互细节

1. **重复任务完成**：浇水/施肥点"完成"后 `completionCount += 1`，不清除任务，达到 `maxCompletions` 后自动标记 `completed`
2. **照片上传**：保留现有上传逻辑
3. **分享**：调用 `navigator.share()` (移动端) 或复制链接
4. **日记**：保留现有 textarea + 提交逻辑
5. **积分动效**：完成任务后弹出 "+10 分" 动画（framer-motion）
6. **空状态**：无认养时显示引导去认养一棵树

---

### Phase 5：i18n 国际化

**文件**：`apps/web/messages/zh-CN.json` (以及 en.json, ja.json)

在 `villagerSystem` 命名空间下新增/扩展 `interactions` 段：

```json
{
  "villagerSystem": {
    "interactions": {
      "eyebrow": "认养互动",
      "title": "我的互动",
      "body": "完成果树互动任务，留下属于你的养护记录。",
      "empty": "当前没有待完成的互动任务",
      "notePlaceholder": "可选：记录本次操作",
      "upload": "拍照并完成",
      "shareText": "我正在走马村认养果树 {treeCode}，一起见证它的成长。",
      "points": {
        "watering": "10 分",
        "fertilizing": "10 分",
        "photo_upload": "15 分",
        "diary": "20 分",
        "share": "15 分"
      },
      "descriptions": {
        "watering": "为认养果树完成一次浇水",
        "fertilizing": "记录一次施肥养护",
        "photo_upload": "上传一张最新成长照片",
        "diary": "写下本次养护观察",
        "share": "把果树成长分享给朋友"
      },
      "actions": {
        "watering": "完成浇水",
        "fertilizing": "完成施肥",
        "photo_upload": "上传照片",
        "diary": "提交日记",
        "share": "复制分享并完成"
      },
      // ★ 新增
      "dashboard": {
        "title": "互动任务系统",
        "totalPoints": "总积分",
        "monthlyProgress": "本月完成",
        "streak": "连续打卡",
        "days": "天",
        "viewAll": "进入互动系统",
        "quickWater": "快速浇水",
        "quickPhoto": "快速拍照"
      },
      "timeline": {
        "title": "养护时间线",
        "empty": "还没有养护记录"
      },
      "redemption": {
        "title": "积分兑换",
        "empty": "暂无兑换商品",
        "cost": "{points} 分",
        "redeem": "立即兑换",
        "confirmTitle": "确认兑换",
        "confirmBody": "将消耗 {points} 积分兑换「{title}」",
        "success": "兑换成功",
        "insufficient": "积分不足"
      },
      "season": {
        "eventTag": "季节限定",
        "bonusPoints": "额外 +{points} 分",
        "endsIn": "剩余 {days} 天"
      },
      "period": {
        "label": "{year}年{month}月任务",
        "refreshHint": "下月任务将在 {date} 刷新"
      },
      "notification": {
        "newTasks": "你的 {month} 月养护任务已就绪",
        "taskDue": "「{title}」即将到期",
        "seasonEvent": "「{title}」季节活动开始了"
      }
    }
  }
}
```

---

### Phase 6：管理后台集成

**路由分组**：`apps/admin/src/app/(assets-commerce)/`

#### 6.1 新建页面

```
apps/admin/src/app/(assets-commerce)/interactions/
├── page.tsx              # 互动任务监控面板
├── season-events/
│   └── page.tsx          # 季节事件管理
└── redemption/
    └── page.tsx          # 兑换管理
```

#### 6.2 功能

- 任务完成统计（按类型/按月份）
- 用户积分排行榜
- 季节事件 CRUD
- 兑换选项管理（上架/下架/补货）
- 兑换记录审核

---

## 四、注意事项 & 风险提示

### 4.1 数据库相关

1. **Prisma 迁移务必先在开发环境验证**。新增 5 个模型 + 修改 1 个模型，迁移文件可能较大。
2. **`periodKey` 设计**：建议格式 `YYYY-MM`（如 `2026-07`），与 `FarmingCalendar.solarTerm` 不同粒度。这样每月刷新任务包时可通过 `periodKey` 去重。
3. **`UserPoints` 与 `User` 是 1:1 关系**，但 Prisma 中通过 `userId` unique 约束实现。初次创建时需要用 `upsert` 而非 `create`。
4. **积分事务一致性**：完成任务 → 更新任务状态 → 增加积分 → 写入积分明细，这四个操作需要在同一个 Prisma 事务中（或用 `$transaction`）。
5. **`points` 字段保留兼容**：旧 `points` 字段继续写入（= `totalPointsEarned`），确保现有 API 消费者不报错。

### 4.2 后端 API 相关

6. **现有 API 不要破坏性修改**。所有新增字段使用可选返回（`?? undefined`），确保旧版前端请求不报错。
7. **定时任务端点需要鉴权**。`/api/v1/cron/interaction-refresh` 应在 Vercel `x-cron-secret` header 或类似机制下保护。
8. **周期性任务生成的去重逻辑**：使用 `adoptionId + periodKey + taskType` 三元组查重，避免重复创建。
9. **手机号脱敏保持**：使用现有 `maskPhone` 函数，与认养查询保持一致。

### 4.3 前端相关

10. **`interaction-panel.tsx` 是客户端组件**，当前在树详情页（服务端组件）中使用。升级时需注意：
    - 保留其作为入口卡片的 SSR 友好性
    - 新页面 `/me/interactions` 可整体为客户端组件
11. **设计令牌**：使用现有 6 色系统 (`ink` / `moss` / `lychee` / `water` / `rice` / `stone`)，不引入新颜色。
12. **组件复用**：使用 `packages/ui` 现有组件 (`Section`, `PageHeader`, `StatusBadge`, `EmptyState`, `SafeImage`) 和 `subpage-ui` 工具组件 (`SurfacePanel`, `PanelTitle`, `MetricTile`, `FieldLabel`)。
13. **framer-motion 动效**：积分增加用 `AnimatePresence` + `motion.div` 做弹出消散效果；进度环用 SVG `stroke-dashoffset` 动画。
14. **移动端优先**：任务卡片在小屏上垂直堆叠，积分概览用 3 列网格，兑换卡片用水平滚动。

### 4.4 业务逻辑相关

15. **任务重复次数定义**：
    - 浇水：`maxCompletions = 4`（每周一次）
    - 施肥：`maxCompletions = 1`
    - 拍照上传：`maxCompletions = 1`
    - 养护日记：`maxCompletions = 1`
    - 分享：`maxCompletions = 1`
16. **完成即得分**：每次完成（`completionCount` 递增）都触发积分入账，而非等全部次数完成。
17. **过期逻辑**：月底未完成的任务 → `status = "expired"`（由 cron job 执行）。
18. **季节事件优先级**：季节事件生成的任务 `seasonEventId` 非空，在 UI 上特殊标注，`bonusPoints` 叠加在基础分上。

### 4.5 文件结构约定

19. **遵循项目约定**：
    - 新 API 路由放在 `apps/web/src/app/api/v1/` 下
    - 新页面放在 `apps/web/src/app/[locale]/me/interactions/`
    - 新组件放在 `apps/web/src/components/` 下
    - 新 lib 工具放在 `apps/web/src/lib/` 下
    - 类型定义追加到 `packages/contracts/src/index.ts`
    - **不要修改 `packages/ui`** 除非确实需要新增通用组件
20. **导入别名**：
    - `@web/` → `apps/web/src/`
    - `@ui/` → `packages/ui/src/`
    - `@zouma/database` → `packages/database/src/`
    - `@zouma/contracts` → `packages/contracts/src/`

### 4.6 测试相关

21. 更新 `interaction-tasks.test.ts` 和 `interaction-generator.test.ts` 覆盖新逻辑。
22. 新增 API 测试（至少覆盖周期性任务生成、积分入账、兑换流程）。

---

## 五、执行顺序（推荐）

```
Day 1-2:  Phase 1 — 数据库 Schema 设计 & 迁移
Day 2-3:  Phase 2 — Contracts 类型定义
Day 3-5:  Phase 3 — 后端 API 路由 (interactions 增强 + points + redeem + cron)
Day 5-7:  Phase 4 — 前端页面 & 组件
Day 7-8:  Phase 5 — i18n 文案
Day 8-9:  Phase 6 — 管理后台集成
Day 9-10: 联调测试 & bug 修复
```

**依赖关系**：
- Phase 4 依赖 Phase 3（前端需要 API）
- Phase 3 依赖 Phase 1+2（API 需要 Schema + 类型）
- Phase 5 可与 Phase 4 并行
- Phase 6 可与 Phase 4-5 并行

---

## 六、关键文件变更清单（已根据复核修正）

```
✏️  修改  packages/database/prisma/schema.prisma
      ├── 增强 VisitorInteractionTask（+6 字段）
      ├── 🆕 AdoptionPoints（替代原 UserPoints，绑定认养而非用户）
      ├── 🆕 PointsTransaction（关联 AdoptionPoints）
      ├── 🆕 SeasonEvent
      ├── 🆕 RedemptionOption（补齐 records RedemptionRecord[] 反向关联）
      ├── 🆕 RedemptionRecord（关联 RedemptionOption）
      └── ✏️ TreeAdoption（+ pointsAccount AdoptionPoints?）
🆕 新增  packages/database/prisma/migrations/*
✏️  修改  packages/contracts/src/index.ts（新增 ~8 类型，注意勿与 interaction-tasks.ts 重复定义 InteractionTaskType）
✏️  修改  apps/web/src/lib/interaction-tasks.ts（增加 repeatCounts 配置）
✏️  修改  apps/web/src/lib/interaction-generator.ts（+ share 任务 + 周期性 periodKey 支持）
🆕 新增  apps/web/src/lib/interaction-periodic.ts
🆕 新增  apps/web/src/lib/points-service.ts（积分入账/兑换，操作 AdoptionPoints）
✏️  修改  apps/web/src/app/api/v1/interactions/route.ts（增强 GET/PATCH/POST）
🆕 新增  apps/web/src/app/api/v1/interactions/periodic/route.ts
🆕 新增  apps/web/src/app/api/v1/interactions/seasonal/route.ts
🆕 新增  apps/web/src/app/api/v1/points/route.ts（绑定 adoptionId）
🆕 新增  apps/web/src/app/api/v1/redeem/route.ts（路径简化）
🆕 新增  apps/web/src/app/api/v1/cron/interaction-refresh/route.ts（复用 POST + Bearer CRON_SECRET 鉴权）
✏️  修改  apps/web/src/components/interaction-panel.tsx（升级为入口卡片）
🆕 新增  apps/web/src/components/interactions/interaction-dashboard.tsx（组件移至 components/ 目录）
🆕 新增  apps/web/src/components/interactions/task-list.tsx
🆕 新增  apps/web/src/components/interactions/task-card.tsx
🆕 新增  apps/web/src/components/interactions/points-summary.tsx
🆕 新增  apps/web/src/components/interactions/timeline.tsx
🆕 新增  apps/web/src/components/interactions/season-banner.tsx
🆕 新增  apps/web/src/components/interactions/redemption-panel.tsx
🆕 新增  apps/web/src/components/interactions/redemption-card.tsx
🆕 新增  apps/web/src/app/[locale]/me/interactions/page.tsx（服务端入口，导入上述组件）
✏️  修改  apps/web/messages/zh-CN.json
✏️  修改  apps/web/messages/en.json
✏️  修改  apps/web/messages/ja.json
🆕 新增  apps/admin/src/app/(assets-commerce)/interactions/page.tsx
🆕 新增  apps/admin/src/app/(assets-commerce)/interactions/season-events/page.tsx
🆕 新增  apps/admin/src/app/(assets-commerce)/interactions/redemption/page.tsx
✏️  修改  apps/web/src/app/[locale]/me/page.tsx（增加互动入口）
✏️  修改  apps/web/src/app/[locale]/trees/[code]/page.tsx（面板升级）
```

---

> **以上方案已充分考虑现有代码结构、命名约定、设计令牌、i18n 架构和 API 模式。可直接交由 Codex 按 Phase 顺序执行。**

---

## 七、复核审查报告（2026-07-01）

> 以下是对照实际代码库逐项核查后发现的问题及修正建议。

### 🔴 严重问题（必须修正）

#### 7.1 身份体系不兼容 — 积分账户绑定对象错误

**问题**：方案中 `UserPoints` 通过 `userId` 关联 `User` 模型（JWT 注册用户），但现有互动系统使用 **手机号** 作为身份标识（`adopterPhone`，存储在 `localStorage.tourist_phone`）。这两种身份体系是独立的：

- **JWT 用户**：通过手机号 OTP 登录创建 `User` 记录
- **手机号游客**：认养时输入手机号，但可能从未注册账号

实际认养流程 (`adoption-flow.tsx`) 中，用户只需输入手机号即可完成认养，不强制注册。这意味着大量认养用户可能没有 `User.id`。

**修正方案**：积分系统应绑定到 **认养关系** 而非用户账号：

```prisma
model AdoptionPoints {
  id              String   @id @default(cuid())
  adoptionId      String   @unique // 一对一关联认养
  totalPoints     Int      @default(0)
  availablePoints Int      @default(0)
  redeemedPoints  Int      @default(0)
  updatedAt       DateTime @updatedAt @map("updated_at")

  adoption        TreeAdoption @relation(fields: [adoptionId], references: [id])
  transactions    PointsTransaction[]

  @@map("adoption_points")
}

model PointsTransaction {
  id              String        @id @default(cuid())
  adoptionPointsId String
  amount          Int
  type            String        // earn | redeem | expire | adjust
  source          String
  referenceId     String?
  note            String?       @db.Text
  createdAt       DateTime      @default(now()) @map("created_at")

  adoptionPoints  AdoptionPoints @relation(fields: [adoptionPointsId], references: [id])

  @@index([adoptionPointsId, createdAt])
  @@map("points_transaction")
}
```

同时，`TreeAdoption` 模型新增反向关联：
```prisma
model TreeAdoption {
  // ...existing fields...
  pointsAccount AdoptionPoints?
}
```

> **影响范围**：Phase 1 数据库设计、Phase 2 类型定义、Phase 3 API 路由、Phase 4 前端查询逻辑。

#### 7.2 Cron 鉴权模式错误

**问题**：方案写的是 "Vercel `x-cron-secret` header"，但实际项目中的 cron 端点 (`/api/v1/cron/daily-report/route.ts`) 使用 `POST` 方法 + `Authorization: Bearer <CRON_SECRET>` 鉴权。

**修正**：新建的 `/api/v1/cron/interaction-refresh/route.ts` 必须复用相同鉴权模式：

```ts
export async function POST(request: Request) {
  const secret = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return jsonResponse(request, { error: { code: "UNAUTHORIZED", message: "Cron secret is invalid." } }, { status: 401 })
  }
  // ...
}
```

**注意**：环境变量名必须对齐，使用 `CRON_SECRET`（非 `CRON_SECRET_KEY` 或其他）。

---

### 🟡 中等问题（建议修正）

#### 7.3 Prisma 关系声明不完整

以下双向关系需要补齐：

| 模型 | 缺失字段 |
|------|----------|
| `RedemptionOption` | `records RedemptionRecord[]`（反向关联） |
| `SeasonEvent` | ✅ 已有 `tasks VisitorInteractionTask[]` |

由于积分改为绑定认养（见 7.1），`User` 模型不再需要 `pointsAccount` / `pointsTransactions` / `redemptionRecords` 字段。

#### 7.4 类型定义与现有 `interaction-tasks.ts` 重复

`packages/contracts/src/index.ts` 中新定义的 `InteractionTaskType` 与 `apps/web/src/lib/interaction-tasks.ts` 中已有的类型完全重复。

**修正**：contracts 中不应重复定义 `InteractionTaskType`，而是从 `interaction-tasks.ts` 导出的类型中引用。或者将类型定义统一迁移到 contracts 包，`interaction-tasks.ts` 改为从 contracts 导入。

推荐做法：保持 `interaction-tasks.ts` 为单一事实来源，contracts 中新增的 `InteractionTaskData` 等接口直接使用 `InteractionTaskType`（从 contracts re-export）。

#### 7.5 非完整月份的认养处理

方案假设每月 1 号刷新任务包，但认养可能发生在月中（如 7 月 15 日）。此时应生成**当月的剩余任务**还是**完整任务包**？

**建议**：
- 认养发生在当月：立即生成当月完整任务包（包括之前的周次浇水也创建，给用户追赶空间）
- Cron 每月 1 号：仅为 `active` 认养生成新月度任务包
- `periodKey` 使用 `YYYY-MM` 格式确保同月不重复

#### 7.6 前端组件文件放置

方案将 9 个组件放在 `apps/web/src/app/[locale]/me/interactions/`（页面目录内 co-location）。这符合 Next.js App Router 惯例，但与项目现有模式（组件放 `apps/web/src/components/`）略有不同。

以下两种做法均可接受：
- **A（推荐）**：页面级组件放 `apps/web/src/components/interactions/`，页面文件 `page.tsx` 从该目录导入
- **B**：co-location 在页面目录下

考虑到项目现有组件全在 `components/` 下（如 `interaction-panel.tsx`、`adoption-rights-panel.tsx`），**推荐方案 A**。

修正后文件结构：
```
apps/web/src/components/interactions/
├── interaction-dashboard.tsx
├── task-list.tsx
├── task-card.tsx
├── points-summary.tsx
├── timeline.tsx
├── season-banner.tsx
├── redemption-panel.tsx
└── redemption-card.tsx

apps/web/src/app/[locale]/me/interactions/
└── page.tsx  (服务端入口，导入上述组件)
```

#### 7.7 API 路径简化

原方案中积分相关 API 路径偏复杂：

| 原路径 | 简化后 |
|--------|--------|
| `GET /api/v1/points?adoptionId=xxx` | ✅ 保持 |
| `GET /api/v1/points/transactions?adoptionId=xxx` | 合并到 `GET /api/v1/points?adoptionId=xxx&include=transactions` |
| `GET /api/v1/points/redeem` | `GET /api/v1/redeem/options` |
| `POST /api/v1/points/redeem` | `POST /api/v1/redeem` |
| `GET /api/v1/points/redeem/history` | `GET /api/v1/redeem?adoptionId=xxx` |

这样更符合 REST 惯例，且路径层级更扁平。

---

### 🟢 细节确认（已验证通过）

| 检查项 | 状态 |
|--------|------|
| 设计令牌颜色系统（6 色） | ✅ 正确引用 `ink/moss/lychee/water/rice/stone` |
| 导入别名 (`@web/`, `@ui/`, `@zouma/*`) | ✅ 与实际 tsconfig paths 一致 |
| Prisma `@map` 蛇形命名约定 | ✅ 与现有模型一致 |
| i18n 命名空间 (`villagerSystem.interactions`) | ✅ 与实际 `zh-CN.json` 结构一致 |
| `interaction-generator.ts` 缺少 share 任务 | ✅ 确认为实际 bug，需修复 |
| `interaction-tasks.ts` 5 种类型定义完整 | ✅ 包含 share(15分) |
| API 响应格式 `{ data, meta?, error? }` | ✅ 与 `aigc-api.ts` 一致 |
| `PageHeader` + `Section` 页面布局模式 | ✅ 与 `/me/page.tsx` 和 `/trees/[code]/page.tsx` 一致 |
| 现有 cron 目录存在 (`cron/daily-report/`) | ✅ 确认为已有模式 |
| `maskPhone` 手机号脱敏函数 | ✅ 存在于 `tree-records.ts` |
| `fetchWithAuth` 认证请求封装 | ✅ 存在于 `auth-client.ts` |
| framer-motion 已在项目中使用 | ✅ 从 `interaction-panel.tsx` 等组件可见 |
| Lucide 图标库 (`lucide-react`) | ✅ 项目已安装并使用 |

---

### 📋 修正后的执行顺序

```
Day 1:    Phase 1 修正 — 按 7.1 调整 Schema（AdoptionPoints 替代 UserPoints）
Day 2:    Phase 2 — Contracts 类型（注意 7.4 类型重复问题）
Day 3-4:  Phase 3 — 后端 API（注意 7.2 Cron 鉴权、7.7 路径简化）
Day 5-6:  Phase 4 — 前端页面与组件（注意 7.6 组件目录、7.5 非完整月份逻辑）
Day 7:    Phase 5 — i18n 三语文案
Day 8:    Phase 6 — 管理后台
Day 9:    联调 + 边界测试
```

> **结论**：方案整体架构合理，但存在 2 个严重问题必须修正（身份体系、Cron 鉴权）和 5 个优化建议。修正后可直接执行。
