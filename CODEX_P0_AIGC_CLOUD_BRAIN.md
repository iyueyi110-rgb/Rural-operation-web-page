# 走马村 AIGC 云脑 — Codex P0 执行指令

## 架构决策

- **不新建独立项目**：在当前 `d:\1\AIGC` monorepo 中扩展 `apps/admin`
- **前台零改动**：`apps/web` 所有现有页面/组件/API 保持不变
- **所有新增都是增量**：新文件、新路由、新表，不修改任何现有功能代码
- **依赖方向**：`packages/utils` 保持无 DB 依赖（纯计算）；DB 相关逻辑放 `apps/web/src/lib/`

---

## 验收标准

### P0 总体验收（全部完成后逐项检查）

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | Admin 7 个菜单均可点击导航，sidebar 共享 | 点击每个菜单 → URL 变化 → 对应页面渲染，刷新后停留在当前页 |
| 2 | 数据库新增 6 张表，seed 初始化 17 个 SpaceNode | `npx prisma db push` 无报错，`npx prisma db seed` 成功 |
| 3 | 统一订单 API 可用，订单带 nodeId 点位标签 | `POST /api/v1/orders` → 201 → DB 有记录 → `GET /api/v1/orders?nodeId=X` 返回筛选结果 |
| 4 | PresenceLog API 可接收硬件上报的人群数据 | `POST /api/v1/presence` → 201 → `GET /api/v1/presence?latest=true` 返回最新数据 |
| 5 | 评分引擎实时计算吸引力分和安全风险分 | 注入 presence 数据 → `GET /api/v1/nodes/scores?date=today` → 返回带评分的节点列表 |
| 6 | AI 日报引擎生成叙事性日报 + 优先级行动建议 | `POST /api/v1/reports/generate` → 返回结构化 JSON 日报，actionItems >= 3 条 |
| 7 | 前台 web 所有功能不受影响 | `pnpm dev` (:3000)，四境/路线/预约/认养/门票/反馈 全部正常 |
| 8 | 反馈管理功能与重构前一致 | `/feedback` 页面工单列表、详情、状态变更均正常 |

---

## P0.0：准备工作 — 补充依赖和配置

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 0.1 | admin 依赖完整 | `pnpm install` 无报错，`@zouma/database` `@zouma/utils` `@zouma/ui` 可 import |
| 0.2 | admin 构建配置正确 | `cd apps/admin && pnpm build` 成功（或 `tsc --noEmit` 无类型错误） |
| 0.3 | 环境变量就绪 | `.env.example` 包含 `CRON_SECRET=` |

### 指令

#### 1. 修改 `apps/admin/package.json`

在 `dependencies` 中新增三行：

```json
"@zouma/database": "workspace:*",
"@zouma/utils": "workspace:*",
"@zouma/ui": "workspace:*"
```

#### 2. 修改 `apps/admin/next.config.mjs`

`transpilePackages` 改为：

```js
transpilePackages: ["@zouma/contracts", "@zouma/database", "@zouma/utils", "@zouma/ui"],
```

#### 3. 修改 `.env.example`

末尾追加：

```
CRON_SECRET=
```

#### 4. 安装依赖

```bash
pnpm install
```

---

## P0.1：数据库新增 6 个模型 + contracts 新类型

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1.1 | 6 张新表创建成功 | `npx prisma db push` 无报错，PostgreSQL 中出现 `space_node` `presence_log` `node_daily_score` `unified_order` `daily_report` `sensor_reading` |
| 1.2 | 现有表不受影响 | `feedback_ticket` `feedback_handling_record` 结构和数据完好 |
| 1.3 | contracts 新类型可 import | `import { SpaceNodeData, UnifiedOrderData, DailyReportData } from "@zouma/contracts"` 无类型错误 |
| 1.4 | Prisma Client 可查询新表 | `prisma.spaceNode.findMany()` 不报错 |

### 指令

#### 1. 修改 `packages/database/prisma/schema.prisma`

在现有 `FeedbackHandlingRecord` 模型**之后**追加（不修改现有两个模型的任何字段）：

```prisma
// ==== AIGC 云脑模型 ====

model SpaceNode {
  id             String           @id @default(cuid())
  slug           String           @unique
  nameKey        String
  realm          String
  nodeType       String
  lat            Float?
  lng            Float?
  capacity       Int              @default(50)
  terrainRisk    Float            @default(0)
  watersideRisk  Float            @default(0)
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  presenceLogs   PresenceLog[]
  dailyScores    NodeDailyScore[]
  orders         UnifiedOrder[]

  @@map("space_node")
}

model PresenceLog {
  id           String    @id @default(cuid())
  nodeId       String
  timestamp    DateTime  @default(now())
  peopleCount  Int
  dwellAvgMin  Float?
  source       String    @default("wifi_probe")
  createdAt    DateTime  @default(now()) @map("created_at")

  node         SpaceNode @relation(fields: [nodeId], references: [id])

  @@index([nodeId, timestamp])
  @@map("presence_log")
}

model NodeDailyScore {
  id               String    @id @default(cuid())
  nodeId           String
  date             String
  totalVisitors    Int       @default(0)
  peakPeopleCount  Int       @default(0)
  avgDwellMin      Float     @default(0)
  attractiveness   Float     @default(0)
  safetyRisk       Float     @default(0)
  weatherCondition String?
  createdAt        DateTime  @default(now()) @map("created_at")

  node             SpaceNode @relation(fields: [nodeId], references: [id])

  @@unique([nodeId, date])
  @@map("node_daily_score")
}

model UnifiedOrder {
  id          String    @id @default(cuid())
  orderType   String
  productId   String
  productName String
  quantity    Int       @default(1)
  totalAmount Float     @default(0)
  status      String    @default("pending_payment")
  nodeId      String?
  metadata    Json?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  node        SpaceNode? @relation(fields: [nodeId], references: [id])

  @@index([nodeId, createdAt])
  @@map("unified_order")
}

model DailyReport {
  id          String   @id @default(cuid())
  date        String   @unique
  title       String
  summary     String   @db.Text
  sections    Json
  metrics     Json
  actionItems Json
  status      String   @default("published")
  generatedAt DateTime @default(now())
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("daily_report")
}

model SensorReading {
  id        String   @id @default(cuid())
  sensorId  String
  type      String
  value     Float
  unit      String
  nodeId    String?
  createdAt DateTime @default(now()) @map("created_at")

  @@index([sensorId, createdAt])
  @@map("sensor_reading")
}
```

#### 2. 执行迁移

```bash
cd packages/database
npx prisma db push
```

#### 3. 修改 `packages/contracts/src/index.ts`

在现有类型**之后**追加：

```ts
// ==== AIGC 云脑新增 ====

export type SpaceNodeType = "entrance" | "viewpoint" | "activity" | "rest" | "shop" | "waterside"
export type PresenceSource = "wifi_probe" | "camera" | "infrared" | "manual"
export type OrderType = "courtyard_booking" | "tree_adoption" | "ticket_order"

export interface SpaceNodeData {
  id: string
  slug: string
  nameKey: string
  realm: SceneRealm
  nodeType: SpaceNodeType
  lat?: number
  lng?: number
  capacity: number
  terrainRisk: number
  watersideRisk: number
}

export interface PresenceLogData {
  id: string
  nodeId: string
  timestamp: string
  peopleCount: number
  dwellAvgMin?: number
  source: PresenceSource
}

export interface NodeDailyScoreData {
  id: string
  nodeId: string
  date: string
  totalVisitors: number
  peakPeopleCount: number
  avgDwellMin: number
  attractiveness: number
  safetyRisk: number
  weatherCondition?: string
}

export interface UnifiedOrderData {
  id: string
  orderType: OrderType
  productId: string
  productName: string
  quantity: number
  totalAmount: number
  status: string
  nodeId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReportSectionData {
  type: "visitor_flow" | "consumption" | "alerts" | "feedback" | "weather"
  title: string
  content: string
}

export interface ReportMetricsData {
  totalVisitors: number
  totalRevenue: number
  totalOrders: number
  alertCount: number
  feedbackCount: number
  avgSatisfaction: number
}

export interface ActionItemData {
  priority: "high" | "medium" | "low"
  category: "safety" | "operation" | "service" | "facility"
  action: string
  deadline?: string
}

export interface DailyReportData {
  id: string
  date: string
  title: string
  summary: string
  sections: ReportSectionData[]
  metrics: ReportMetricsData
  actionItems: ActionItemData[]
  status: string
  generatedAt: string
}
```

---

## P0.2：SpaceNode Seed 数据

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 2.1 | 17 个 SpaceNode 入库 | `npx prisma db seed` → 无报错 → `prisma.spaceNode.count()` = 17 |
| 2.2 | 重复执行不报错 | 再次 `npx prisma db seed` → 不报 duplicate key 错误（upsert 模式） |
| 2.3 | 节点覆盖所有 routes-data waypoints | 13 个路线点位 + 4 个四境入口全部存在 |

### 指令

#### 1. 新建 `packages/database/prisma/seed-nodes.ts`

```ts
import { prisma } from "../src/index"

const nodes = [
  // === 路线点位 (13个，从 routes-data.ts 6条路线的 waypoints 去重) ===
  // realm: ancient_road — 5个
  { slug: "visitor-center",      nameKey: "waypoints.visitorCenter",     realm: "ancient_road",      nodeType: "entrance",   capacity: 200, terrainRisk: 0.05, watersideRisk: 0,    lat: 29.8512, lng: 106.3210 },
  { slug: "taojiawan",           nameKey: "waypoints.taojiawan",         realm: "ancient_road",      nodeType: "viewpoint",  capacity: 80,  terrainRisk: 0.20, watersideRisk: 0,    lat: 29.8530, lng: 106.3235 },
  { slug: "ancient-road",        nameKey: "waypoints.ancientRoad",       realm: "ancient_road",      nodeType: "activity",   capacity: 60,  terrainRisk: 0.30, watersideRisk: 0.05, lat: 29.8550, lng: 106.3260 },
  { slug: "indoor-story",        nameKey: "waypoints.indoorStory",       realm: "ancient_road",      nodeType: "activity",   capacity: 40,  terrainRisk: 0,    watersideRisk: 0,    lat: 29.8520, lng: 106.3220 },
  { slug: "shaded-ancient-road", nameKey: "waypoints.shadedAncientRoad", realm: "ancient_road",      nodeType: "viewpoint",  capacity: 50,  terrainRisk: 0.25, watersideRisk: 0,    lat: 29.8545, lng: 106.3250 },

  // realm: lychee_field — 3个
  { slug: "lychee-garden",       nameKey: "waypoints.lycheeGarden",      realm: "lychee_field",      nodeType: "activity",   capacity: 100, terrainRisk: 0.10, watersideRisk: 0.10, lat: 29.8490, lng: 106.3190 },
  { slug: "food-classroom",      nameKey: "waypoints.foodClassroom",     realm: "lychee_field",      nodeType: "activity",   capacity: 40,  terrainRisk: 0.05, watersideRisk: 0,    lat: 29.8495, lng: 106.3180 },
  { slug: "tree-adoption",       nameKey: "waypoints.treeAdoption",      realm: "lychee_field",      nodeType: "activity",   capacity: 30,  terrainRisk: 0.05, watersideRisk: 0,    lat: 29.8480, lng: 106.3170 },

  // realm: resilience_valley — 2个
  { slug: "waterfront-rest",     nameKey: "waypoints.waterfrontRest",    realm: "resilience_valley", nodeType: "rest",       capacity: 60,  terrainRisk: 0.10, watersideRisk: 0.50, lat: 29.8470, lng: 106.3150 },
  { slug: "resilience-workshop", nameKey: "waypoints.resilienceWorkshop",realm: "resilience_valley", nodeType: "activity",   capacity: 50,  terrainRisk: 0.15, watersideRisk: 0.10, lat: 29.8465, lng: 106.3130 },

  // realm: ridge_dwelling — 3个
  { slug: "ridge-courtyard",     nameKey: "waypoints.ridgeCourtyard",    realm: "ridge_dwelling",    nodeType: "shop",       capacity: 40,  terrainRisk: 0.10, watersideRisk: 0,    lat: 29.8525, lng: 106.3300 },
  { slug: "village-meal",        nameKey: "waypoints.villageMeal",       realm: "ridge_dwelling",    nodeType: "shop",       capacity: 80,  terrainRisk: 0.05, watersideRisk: 0,    lat: 29.8515, lng: 106.3290 },
  { slug: "morning-farm",        nameKey: "waypoints.morningFarm",       realm: "ridge_dwelling",    nodeType: "activity",   capacity: 30,  terrainRisk: 0.15, watersideRisk: 0.05, lat: 29.8535, lng: 106.3310 },

  // === 四境核心入口 (4个) ===
  { slug: "ancient-road-core",       nameKey: "scenes.detail.ancientRoad.title",       realm: "ancient_road",      nodeType: "entrance", capacity: 150, terrainRisk: 0.10, watersideRisk: 0.10, lat: 29.8510, lng: 106.3200 },
  { slug: "lychee-field-core",       nameKey: "scenes.detail.lycheeField.title",       realm: "lychee_field",      nodeType: "entrance", capacity: 120, terrainRisk: 0.05, watersideRisk: 0.15, lat: 29.8485, lng: 106.3160 },
  { slug: "resilience-valley-core",  nameKey: "scenes.detail.resilienceValley.title",  realm: "resilience_valley", nodeType: "entrance", capacity: 100, terrainRisk: 0.10, watersideRisk: 0.20, lat: 29.8460, lng: 106.3120 },
  { slug: "ridge-dwelling-core",     nameKey: "scenes.detail.ridgeDwelling.title",     realm: "ridge_dwelling",    nodeType: "entrance", capacity: 80,  terrainRisk: 0.15, watersideRisk: 0,    lat: 29.8520, lng: 106.3280 },
]

export async function seedNodes() {
  for (const node of nodes) {
    await prisma.spaceNode.upsert({
      where: { slug: node.slug },
      create: node,
      update: {
        nameKey: node.nameKey,
        realm: node.realm,
        nodeType: node.nodeType,
        capacity: node.capacity,
        terrainRisk: node.terrainRisk,
        watersideRisk: node.watersideRisk,
        lat: node.lat,
        lng: node.lng,
      },
    })
  }
}
```

#### 2. 修改 `packages/database/prisma/seed.ts`

文件顶部添加 import：

```ts
import { seedNodes } from "./seed-nodes"
```

在 `main()` 函数中，现有逻辑之后、`prisma.$disconnect()` 之前添加：

```ts
await seedNodes()
```

---

## P0.3：Admin Shell 重构

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 3.1 | 7 个菜单项均可点击 | 依次点击每个菜单 → URL 变化 → 对应内容区切换 |
| 3.2 | 当前页高亮 | 在 `/feedback` 时"反馈管理"高亮；在 `/nodes` 时"节点管理"高亮；首页 `/` 时"云脑总览"高亮 |
| 3.3 | 刷新按钮有效 | 在 `/feedback` 点击刷新 → 工单列表重新加载 |
| 3.4 | 反馈管理功能完整 | 工单列表、详情面板、状态变更、处理记录时间线全部正常 |
| 3.5 | layout 共享 | 所有页面左侧均有 sidebar，右侧为内容区 |

### 指令

#### 1. 修改 `apps/admin/src/lib/admin-copy.ts`

**菜单** 替换为：

```ts
menu: [
  { key: "dashboard",      label: "云脑总览", status: "active" },
  { key: "feedback",       label: "反馈管理", status: "active" },
  { key: "nodes",          label: "节点管理", status: "active" },
  { key: "orders",         label: "消费订单", status: "active" },
  { key: "reports",        label: "运营日报", status: "active" },
  { key: "infrastructure", label: "设施调度", status: "active" },
  { key: "settings",       label: "系统设置", status: "active" },
],
```

**在 `adminCopy` 对象末尾**（`} as const` 之前）追加：

```ts
dashboard: {
  title: "云脑总览",
  todaySummary: "今日概览",
  hotNodes: "节点热度 TOP5",
  latestReport: "最新日报",
  activeAlerts: "活跃告警",
  visitors: "今日客流",
  revenue: "今日收入",
  orders: "今日订单",
  satisfaction: "平均满意度",
  noData: "数据收集中，请先接入 PresenceLog 和订单。",
  generateReport: "生成日报",
},
nodes: {
  title: "空间节点",
  attractiveness: "吸引力分",
  safetyRisk: "安全风险分",
  visitors: "今日客流",
  avgDwell: "平均停留(分钟)",
  realm: "所属四境",
  nodeType: "节点类型",
  capacity: "容量",
  terrainRisk: "地形风险",
  watersideRisk: "近水风险",
  noData: "暂无节点数据。",
},
orders: {
  title: "统一订单",
  totalRevenue: "总收入",
  totalOrders: "总订单",
  avgOrder: "客单价",
  filterByType: "按类型",
  filterByNode: "按点位",
  allTypes: "全部类型",
  noData: "暂无订单数据。",
  types: {
    courtyard_booking: "院落预约",
    tree_adoption: "树木认养",
    ticket_order: "票务活动",
  },
},
reports: {
  title: "运营日报",
  generate: "生成日报",
  generating: "AI 正在生成...",
  actions: "行动建议",
  sections: "分析详情",
  noData: "暂无日报，点击上方按钮生成。",
  selectDate: "选择日期",
},
infrastructure: {
  title: "设施调度",
  sensors: "传感器读数",
  commands: "控制指令",
  pending: "硬件待接入",
  noSensorData: "传感器数据待接入。硬件就绪后通过 POST /api/v1/infrastructure/sensors 上报。",
  noCommandData: "暂无控制指令。传感器就绪后，决策引擎将自动生成灌溉/泄洪/火险建议。",
},
settings: {
  title: "系统设置",
  apiBase: "API 地址",
  dbStatus: "数据库",
  dbConnected: "已连接",
  envStatus: "环境变量",
  configured: "已配置",
  notConfigured: "未配置",
},
common: {
  loading: "正在加载...",
  error: "加载失败，请重试。",
  retry: "重试",
  noSelection: "选择左侧项目查看详情。",
  refresh: "刷新",
},
```

#### 2. 新建 `apps/admin/src/components/admin-sidebar.tsx`

```tsx
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  ClipboardList, Cpu, FileText, LayoutDashboard,
  MapPin, RefreshCw, Settings, ShoppingCart,
} from "lucide-react"

import { adminCopy } from "@admin/lib/admin-copy"

const menuIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  feedback: ClipboardList,
  nodes: MapPin,
  orders: ShoppingCart,
  reports: FileText,
  infrastructure: Cpu,
  settings: Settings,
}

const menuHrefs: Record<string, string> = {
  dashboard: "/",
  feedback: "/feedback",
  nodes: "/nodes",
  orders: "/orders",
  reports: "/reports",
  infrastructure: "/infrastructure",
  settings: "/settings",
}

export function AdminSidebar({ onRefresh }: { onRefresh?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="border-b border-stone bg-ink p-4 text-white lg:border-b-0 lg:border-r lg:border-white/10">
      {/* 品牌区 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-lychee text-lg font-extrabold">走</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{adminCopy.shell.brand}</div>
          <div className="text-xs font-semibold text-white/52">{adminCopy.shell.subtitle}</div>
        </div>
      </div>

      {/* 菜单 */}
      <nav className="mt-6 grid gap-2">
        {adminCopy.menu.map((item) => {
          const Icon = menuIcons[item.key]
          const href = menuHrefs[item.key]
          const isActive =
            item.key === "dashboard" ? pathname === "/" : pathname.startsWith(href)

          return (
            <Link
              key={item.key}
              href={href}
              className={
                isActive
                  ? "flex h-11 items-center justify-between rounded-md bg-white px-3 text-sm font-bold text-ink"
                  : "flex h-11 items-center justify-between rounded-md px-3 text-sm font-semibold text-white/62 transition hover:bg-white/10 hover:text-white"
              }
            >
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* 刷新按钮 */}
      {onRefresh ? (
        <button
          className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white/72 transition hover:border-white/30 hover:text-white"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {adminCopy.shell.refresh}
        </button>
      ) : null}
    </aside>
  )
}
```

#### 3. 新建 `apps/admin/src/app/admin-shell.tsx`

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { AdminSidebar } from "@admin/components/admin-sidebar"

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-rice text-ink">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar onRefresh={handleRefresh} />
        <section className="min-w-0 p-4 sm:p-6" key={refreshKey}>
          {children}
        </section>
      </div>
    </main>
  )
}
```

#### 4. 修改 `apps/admin/src/app/layout.tsx`

```tsx
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Noto_Sans_SC } from "next/font/google"

import "./globals.css"
import { adminCopy } from "@admin/lib/admin-copy"
import { AdminShell } from "./admin-shell"

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: adminCopy.metadata.title,
  description: adminCopy.metadata.description,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={notoSansSc.className}>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}
```

#### 5. 修改 `apps/admin/src/app/page.tsx`

```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/dashboard")
}
```

#### 6. 修改 `apps/admin/src/app/feedback-admin.tsx`

精简为只含内容区。**关键操作**：

- 删除 `<main>` 外层和 `<aside>` sidebar→ 这些已在 `AdminShell` 中
- 删除 `<header>` 中的标题区（"反馈管理" / "Feedback Ops" 标题和刷新按钮已移至 sidebar）
- 删除 `menuIcons` 对象 → 已在 sidebar 中
- 保留：`stats` 面板、`apiHint` 提示、`error` 提示、表格、详情面板
- 保留：`loadRecords`、`updateStatus`、stats 逻辑
- 保留：`Stat`、`Cell`、`Meta` 内部组件
- 将 `FeedbackAdmin` 重命名为 `FeedbackContent` 并导出

改后的结构大纲（不要删改现有逻辑，只删外层 layout）：

```tsx
"use client"

import { AlertTriangle, CheckCircle2, RefreshCw, SendHorizontal } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { adminCopy } from "@admin/lib/admin-copy"
import type { Feedback, FeedbackRecord } from "@zouma/contracts"

type FeedbackStatus = Feedback["status"]

const apiBase = process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"
const statusOrder: FeedbackStatus[] = ["submitted", "assigned", "processing", "resolved", "closed"]

const statusTone: Record<FeedbackStatus, string> = {
  submitted: "border-water/20 bg-water/10 text-water",
  assigned: "border-moss/20 bg-moss/10 text-moss",
  processing: "border-lychee/20 bg-lychee/10 text-lychee",
  resolved: "border-moss/20 bg-moss/10 text-moss",
  closed: "border-ink/15 bg-ink/10 text-ink/64",
}

const severityTone: Record<Feedback["severity"], string> = {
  low: "text-ink/56",
  medium: "text-water",
  high: "text-lychee",
  urgent: "text-white bg-lychee",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value))
}

export function FeedbackContent() {
  // === 以下完全保留现有逻辑，一字不改 ===
  const [records, setRecords] = useState<FeedbackRecord[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<FeedbackStatus | "">("")

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? records[0] ?? null,
    [records, selectedId],
  )

  const stats = useMemo(() => {
    const open = records.filter((r) => !["resolved", "closed"].includes(r.status)).length
    const urgent = records.filter((r) => r.severity === "high" || r.severity === "urgent").length
    const average = records.length > 0
      ? (records.reduce((s, r) => s + r.rating, 0) / records.length).toFixed(1)
      : "0.0"
    return { total: records.length, open, urgent, average }
  }, [records])

  async function loadRecords() {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(`${apiBase}/feedback`, { cache: "no-store" })
      if (!res.ok) throw new Error("load failed")
      const result = (await res.json()) as { data: FeedbackRecord[] }
      setRecords(result.data)
      setSelectedId((c) => c || result.data[0]?.id || "")
    } catch {
      setError(adminCopy.detail.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  async function updateStatus(status: FeedbackStatus) {
    if (!selectedRecord) return
    setUpdatingStatus(status)
    setError("")
    try {
      const res = await fetch(`${apiBase}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedRecord.id, status, note }),
      })
      if (!res.ok) throw new Error("update failed")
      const result = (await res.json()) as { data: FeedbackRecord }
      setRecords((c) => c.map((r) => (r.id === result.data.id ? result.data : r)))
      setNote("")
    } catch {
      setError(adminCopy.detail.loadFailed)
    } finally {
      setUpdatingStatus("")
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  // === 渲染部分：删除 <main> <aside> sidebar，保留以下内容 ===
  return (
    <>
      {/* Stats 卡片行 */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={adminCopy.stats.total} value={String(stats.total)} />
        <Stat label={adminCopy.stats.open} value={String(stats.open)} />
        <Stat label={adminCopy.stats.urgent} value={String(stats.urgent)} />
        <Stat label={adminCopy.stats.rating} value={stats.average} />
      </div>

      {/* API 提示 */}
      <p className="mt-4 rounded-md border border-stone bg-white px-4 py-3 text-sm font-semibold text-ink/58 shadow-soft">
        {adminCopy.shell.apiHint}
      </p>

      {/* 错误提示 */}
      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-lychee/10 px-4 py-3 text-sm font-semibold text-lychee">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {/* 表格 + 详情面板 */}
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* 表格 — 完全保留现有代码 */}
        <div className="min-w-0 overflow-hidden rounded-lg border border-stone bg-white shadow-soft">
          {/* ... 表头 + 表体 + loading/empty 状态 — 保持原样 ... */}
        </div>

        {/* 详情面板 — 完全保留现有代码 */}
        <aside className="min-w-0 rounded-lg border border-stone bg-white p-5 shadow-soft">
          {/* ... selectedRecord 详情 + textarea + 状态按钮 + 时间线 — 保持原样 ... */}
        </aside>
      </div>
    </>
  )
}

// === Stat / Cell / Meta 三个内部组件保持原样 ===
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-semibold text-ink/54">{label}</div>
    </div>
  )
}

function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 truncate text-xs font-semibold text-ink/62 ${className}`}>{children}</div>
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink/48">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value}</div>
    </div>
  )
}
```

> **重要**：表格和详情面板的完整 JSX 保持与现有一致，上面只列出了结构框架。不要删减表格列、不要删减详情面板的 textarea/状态按钮/处理记录时间线。

#### 7. 修改 `apps/admin/src/app/feedback/page.tsx`

```tsx
import { FeedbackContent } from "../feedback-admin"

export default function FeedbackPage() {
  return <FeedbackContent />
}
```

---

## P0.4：API 路由

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 4.1 | 所有新 API 路由可访问 | curl 每个端点 → 返回 200/201（非 404） |
| 4.2 | CORS 正确 | 从 `http://localhost:3001` 跨域请求 → 返回 `Access-Control-Allow-Origin` 头 |
| 4.3 | 现有 6 个 API 端点不受影响 | `GET /api/v1/feedback` `POST /api/v1/courtyard-bookings` 等全部正常 |
| 4.4 | 校验生效 | `POST /api/v1/orders` 缺必填字段 → 400；`POST /api/v1/presence` 传不存在的 nodeId → 400 |

### 指令

> 所有新 API 放在 `apps/web/src/app/api/v1/` 下。
> **复用模式**：复制 `feedback/route.ts` 中的 `getCorsHeaders`、`jsonResponse`、`OPTIONS` 三个函数。
> 所有写操作 `import { prisma } from "@zouma/database"`。

#### 4.1 `GET /api/v1/nodes` — 新建 `apps/web/src/app/api/v1/nodes/route.ts`

```ts
// GET: prisma.spaceNode.findMany({ orderBy: { slug: "asc" } })
// 返回 { data: SpaceNode[] }
// OPTIONS: 标准 CORS 预检
```

#### 4.2 `POST + GET /api/v1/orders` — 新建 `apps/web/src/app/api/v1/orders/route.ts`

```ts
// POST:
//   请求体: { orderType, productId, productName, quantity, totalAmount, nodeId?, metadata? }
//   校验: orderType ∈ ["courtyard_booking","tree_adoption","ticket_order"], productId/productName 非空, quantity >= 1, totalAmount >= 0
//   prisma.unifiedOrder.create({ data })
//   返回 { data }, 201

// GET:
//   Query: ?nodeId=X&date=YYYY-MM-DD&orderType=X&page=1&pageSize=20
//   date 筛选: createdAt gte startOfDay, lt endOfDay
//   include { node: true }
//   返回 { data: UnifiedOrder[], meta: { total, page, pageSize } }
```

#### 4.3 `GET /api/v1/analytics/consumption/by-node` — 新建 `apps/web/src/app/api/v1/analytics/consumption/by-node/route.ts`

```ts
// GET:
//   Query: ?date=YYYY-MM-DD
//   使用 prisma.unifiedOrder.groupBy({ by: ["nodeId"], _sum: { totalAmount: true }, _count: { id: true } })
//   再查 SpaceNode 补齐 nodeName
//   返回 { data: [{ nodeId, nodeName, revenue, orderCount }] }
```

#### 4.4 `POST + GET /api/v1/presence` — 新建 `apps/web/src/app/api/v1/presence/route.ts`

```ts
// POST:
//   请求体: { nodeId, peopleCount, dwellAvgMin?, source? }
//   校验: nodeId 存在于 SpaceNode (prisma.spaceNode.findUnique 检查), peopleCount >= 0
//   prisma.presenceLog.create({ data })
//   返回 { data }, 201
//   创建后调用 computeNodeDailyScores(today) 异步更新评分

// GET:
//   Query: ?nodeId=X (可选), ?latest=true (可选), ?page=1&pageSize=50
//   若 latest=true: prisma.presenceLog.findFirst({ where: { nodeId }, orderBy: { timestamp: "desc" } })
//   否则: prisma.presenceLog.findMany({ orderBy: { timestamp: "desc" }, skip, take })
//   返回 { data }
```

#### 4.5 `GET /api/v1/presence/series` — 新建 `apps/web/src/app/api/v1/presence/series/route.ts`

```ts
// GET:
//   Query: ?nodeId=X (必填), ?from=ISO, ?to=ISO
//   prisma.presenceLog.findMany({ where: { nodeId, timestamp: { gte: from, lte: to } }, orderBy: { timestamp: "asc" } })
//   返回 { data: PresenceLog[] }
```

#### 4.6 `GET /api/v1/nodes/scores` — 新建 `apps/web/src/app/api/v1/nodes/scores/route.ts`

```ts
// GET:
//   Query: ?date=YYYY-MM-DD
//   查 NodeDailyScore (include node)
//   若无记录: 调 computeNodeDailyScores(date) (import from "@web/lib/node-scoring"), 再查
//   返回 { data: NodeDailyScore[] }
```

#### 4.7 `GET /api/v1/nodes/scores/[slug]` — 新建 `apps/web/src/app/api/v1/nodes/scores/[slug]/route.ts`

```ts
// GET:
//   params: { slug }, Query: ?days=30
//   先 prisma.spaceNode.findUnique({ where: { slug } })
//   再查该 nodeId 最近 days 天的 NodeDailyScore
//   返回 { data: NodeDailyScore[], node: SpaceNode }
```

#### 4.8 `POST + GET /api/v1/reports` — 新建 `apps/web/src/app/api/v1/reports/route.ts`

```ts
// POST (generate):
//   请求体: { date?: string } (默认今天)
//   步骤:
//     1. 聚合当日 PresenceLog (prisma.presenceLog.aggregate)
//     2. 聚合当日 UnifiedOrder (prisma.unifiedOrder.aggregate)
//     3. 聚合当日 Feedback (prisma.feedbackTicket.count + avg rating)
//     4. 获取天气 (fetch QWeather 或 getWeatherSummary())
//     5. 组装 prompt = JSON.stringify(上述数据)
//     6. ModelProviderAdapter.complete(prompt, { systemPrompt: DAILY_REPORT_SYSTEM_PROMPT })
//     7. 解析 JSON → prisma.dailyReport.upsert({ where: { date }, create/update })
//   返回 { data: DailyReport }
//   AI 不可用: 返回 { error: "AI service unavailable" }, 503

// GET (list):
//   Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
//   prisma.dailyReport.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "desc" } })
//   返回 { data: DailyReport[] }
```

#### 4.9 `GET /api/v1/reports/latest` — 新建 `apps/web/src/app/api/v1/reports/latest/route.ts`

```ts
// GET:
//   prisma.dailyReport.findFirst({ orderBy: { date: "desc" } })
//   返回 { data: DailyReport | null }
```

#### 4.10 `GET /api/v1/cron/daily-report` — 新建 `apps/web/src/app/api/v1/cron/daily-report/route.ts`

```ts
// GET:
//   Query: ?secret=xxx
//   校验 secret === process.env.CRON_SECRET, 不匹配 → 401
//   调用与 POST /api/v1/reports/generate 相同的日报生成逻辑 (提取为共享函数 generateDailyReport(date))
//   返回 { generated: true, date }
```

> **建议**：将日报生成核心逻辑提取为 `apps/web/src/lib/report-generator.ts` 中的 `generateDailyReport(date: string)` 函数，供 `reports/route.ts` POST 和 `cron/daily-report/route.ts` GET 共用。

---

## P0.5：评分引擎

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 5.1 | `computeScores` 纯函数正确 | 传入测试数据 → 返回 0-100 的 attractiveness 和 safetyRisk |
| 5.2 | 高风险节点分数高 | 传入 watersideRisk=0.5 + weatherCondition="rainy" → safetyRisk > 50 |
| 5.3 | `computeNodeDailyScores` 可写 DB | 注入 PresenceLog → 调用函数 → NodeDailyScore 表有记录 |
| 5.4 | upsert 幂等 | 同一天调两次 → 不报 duplicate key |

### 指令

#### 1. 新建 `packages/utils/src/scoring-engine.ts`

纯计算，无 DB 依赖，无外部 import（除 `server-only`）：

```ts
import "server-only"

export interface ScoringInput {
  totalVisitors: number
  peakPeopleCount: number
  avgDwellMin: number
  revisitIndex: number
  terrainRisk: number
  watersideRisk: number
  capacity: number
  weatherCondition: string
}

export interface ScoringOutput {
  attractiveness: number
  safetyRisk: number
}

export function computeScores(input: ScoringInput): ScoringOutput {
  const maxDwell = 120
  const normalizedDwell = Math.min(input.avgDwellMin / maxDwell, 1)
  const normalizedVisitors = Math.min(input.totalVisitors / 500, 1)
  const normalizedPeak = Math.min(input.peakPeopleCount / Math.max(input.capacity, 1), 1)

  const attractiveness = Math.round((
    normalizedVisitors * 0.3 +
    normalizedPeak * 0.2 +
    normalizedDwell * 0.3 +
    Math.min(input.revisitIndex, 1) * 0.2
  ) * 100 * 100) / 100

  const weatherFactor =
    input.weatherCondition === "rainy" ? 0.3 :
    input.weatherCondition === "hot" ? 0.2 : 0

  const densityFactor = Math.min(
    input.peakPeopleCount / Math.max(input.capacity, 1), 1
  )

  const safetyRisk = Math.round((
    input.terrainRisk * 0.2 +
    input.watersideRisk * 0.2 +
    weatherFactor * 0.35 +
    densityFactor * 0.25
  ) * 100 * 100) / 100

  return { attractiveness, safetyRisk }
}
```

#### 2. 新建 `apps/web/src/lib/node-scoring.ts`

含 DB 查询，放 web app（不在 utils 包）：

```ts
import "server-only"

import { prisma } from "@zouma/database"
import { computeScores } from "@zouma/utils"

export async function computeNodeDailyScores(date: string): Promise<void> {
  const nodes = await prisma.spaceNode.findMany()

  for (const node of nodes) {
    const startOfDay = new Date(`${date}T00:00:00+08:00`)
    const endOfDay = new Date(`${date}T23:59:59+08:00`)

    const logs = await prisma.presenceLog.findMany({
      where: { nodeId: node.id, timestamp: { gte: startOfDay, lt: endOfDay } },
    })

    if (logs.length === 0) continue

    const totalVisitors = logs.reduce((s, l) => s + l.peopleCount, 0)
    const peakPeopleCount = Math.max(...logs.map((l) => l.peopleCount))
    const logsWithDwell = logs.filter((l) => l.dwellAvgMin != null)
    const avgDwellMin = logsWithDwell.length > 0
      ? logsWithDwell.reduce((s, l) => s + (l.dwellAvgMin ?? 0), 0) / logsWithDwell.length
      : 0
    const revisitIndex = logs.length > 1 ? 0.3 : 0

    // 天气：后续可从 QWeather API 实时获取，当前默认 "sunny"
    const weatherCondition = "sunny"

    const scores = computeScores({
      totalVisitors, peakPeopleCount, avgDwellMin, revisitIndex,
      terrainRisk: node.terrainRisk,
      watersideRisk: node.watersideRisk,
      capacity: node.capacity,
      weatherCondition,
    })

    await prisma.nodeDailyScore.upsert({
      where: { nodeId_date: { nodeId: node.id, date } },
      create: {
        nodeId: node.id, date,
        totalVisitors, peakPeopleCount, avgDwellMin,
        attractiveness: scores.attractiveness,
        safetyRisk: scores.safetyRisk,
        weatherCondition,
      },
      update: {
        totalVisitors, peakPeopleCount, avgDwellMin,
        attractiveness: scores.attractiveness,
        safetyRisk: scores.safetyRisk,
        weatherCondition,
      },
    })
  }
}
```

#### 3. 修改 `packages/utils/src/index.ts`

在末尾追加：

```ts
export { computeScores } from "./scoring-engine"
export type { ScoringInput, ScoringOutput } from "./scoring-engine"
```

---

## P0.6：AI 日报 Prompt 模板

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 6.1 | Prompt 可从 prompts 包 import | `import { DAILY_REPORT_SYSTEM_PROMPT } from "@zouma/prompts/daily-report"` 无报错 |
| 6.2 | AI 返回合法 JSON | 调用 generate → 返回的 content 可 `JSON.parse()` 且包含 title/summary/sections/metrics/actionItems |

### 指令

#### 1. 新建 `packages/prompts/daily-report.ts`

```ts
export const DAILY_REPORT_SYSTEM_PROMPT = `你是走马村「云脉寿岭·荔水走马」AIGC 云脑的运营分析助手。

你需要根据提供的当日运营数据，生成一份结构化运营日报。

返回纯 JSON（不要 markdown 代码块），结构如下：
{
  "title": "走马村运营日报 - YYYY年MM月DD日",
  "summary": "一段话概述当日整体情况",
  "sections": [
    { "type": "visitor_flow", "title": "客流概况", "content": "..." },
    { "type": "consumption", "title": "消费分析", "content": "..." },
    { "type": "alerts", "title": "安全态势", "content": "..." },
    { "type": "feedback", "title": "游客反馈", "content": "..." },
    { "type": "weather", "title": "天气信息", "content": "..." }
  ],
  "metrics": {
    "totalVisitors": 0,
    "totalRevenue": 0,
    "totalOrders": 0,
    "alertCount": 0,
    "feedbackCount": 0,
    "avgSatisfaction": 0
  },
  "actionItems": [
    { "priority": "high", "category": "safety", "action": "具体可执行建议", "deadline": "次日10:00前" }
  ]
}

要求：
- 中文输出
- 引用具体数字，不要模糊描述
- 行动建议可执行（说明做什么、谁做、什么时候完成），不要说空话
- 数据不足以支撑某个维度分析时，写"暂无足够数据"
- actionItems 至少 3 条、最多 5 条，按 priority 降序排列
- JSON 外不要输出任何其他文字`
```

#### 2. 新建 `packages/prompts/package.json`

```json
{
  "name": "@zouma/prompts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./daily-report.ts",
  "types": "./daily-report.ts"
}
```

---

## P0.7：Admin 5 个新页面

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 7.1 | Dashboard 展示 4 个区域 | 指标卡片行 + 日报摘要 + TOP5 + 告警，无报错 |
| 7.2 | Nodes 表格展示 17 个节点 | 列完整，点击行可查看评分详情 |
| 7.3 | Orders 支持筛选 | 切换 orderType/nodeId → 表格数据变化 |
| 7.4 | Reports 可手动生成日报 | 点击"生成" → loading → 日报展示 → 可查看 actionItems |
| 7.5 | Infrastructure 显示"硬件待接入" | 传感器卡片显示占位文案，不报错 |
| 7.6 | Settings 显示配置状态 | API KEY 用绿/灰圆点指示 |
| 7.7 | 所有页面 loading/error/空数据状态正确 | 首次加载显示 loading；API 不可用时显示 error + 重试；无数据时显示"暂无" |

### 指令

> 所有页面均 `"use client"`，`import { adminCopy } from "@admin/lib/admin-copy"`，使用 Tailwind 样式（与 feedback-admin.tsx 一致的颜色 token）。
> 每个页面自行管理 `useState` + `useEffect` 加载数据，处理 loading / error / empty 三种状态。
> API base 使用 `process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"`。

#### 7.1 Dashboard — `apps/admin/src/app/dashboard/page.tsx`

**布局**（从上到下）：

1. **今日指标 4 卡片**（grid-cols-4）
   - 今日客流：汇总各节点 `PresenceLog` latest peopleCount
   - 今日订单：`GET /api/v1/orders?date=today` → `meta.total`
   - 今日收入：同上，聚合 `totalAmount`
   - 平均满意度：`GET /api/v1/feedback` → 计算 avg rating
   - 卡片样式与 `feedback-admin.tsx` 中 `Stat` 一致

2. **最新日报摘要**（卡片）
   - `GET /api/v1/reports/latest` → 若有：显示 `summary` + 前 3 条 `actionItems`（带优先级颜色标签）
   - 若无：显示"暂无日报" + "生成日报"按钮 → 调 `POST /api/v1/reports/generate`（显示 loading 状态）

3. **节点热度 TOP5**（卡片）
   - `GET /api/v1/nodes/scores?date=today` → 按 `attractiveness` 降序取前 5
   - 每条：排名数字 + 节点中文名（从 nodes API 关联）+ 吸引力分 + 安全风险分
   - 安全风险分颜色：`< 30` 绿色 / `30-70` 黄色 / `> 70` 红色

4. **活跃告警**（卡片）
   - 从 nodes/scores 筛选 `safetyRisk > 70` 的节点
   - 显示：节点名、风险分、天气条件、建议文字

#### 7.2 Nodes — `apps/admin/src/app/nodes/page.tsx`

**布局**：左侧表格 + 右侧详情面板（复用 `MasterDetailLayout` 模式 或 两列 grid）

1. **节点表格**（左侧）
   - `GET /api/v1/nodes` → 列：slug、nameKey、realm、nodeType、capacity、terrainRisk、watersideRisk
   - 行点击选中节点

2. **节点详情**（右侧面板）
   - 选中节点后：`GET /api/v1/nodes/scores/[slug]`
   - 显示：今日 attractiveness / safetyRisk / totalVisitors / avgDwellMin
   - 30 天趋势简述（如"吸引力分近7天上升12%"）— 可简化为文字

#### 7.3 Orders — `apps/admin/src/app/orders/page.tsx`

**布局**：

1. **筛选栏**（水平排列）
   - orderType：下拉（全部/院落预约/树木认养/票务活动）
   - nodeId：下拉（全部 + 各节点名）
   - 日期：input type="date"

2. **统计卡片**（3 列）：总收入、总订单、客单价（总收入/总订单）

3. **订单表格**
   - `GET /api/v1/orders?{筛选参数}` → 列：ID(截断前8位)、类型(中文)、商品名、数量、金额、点位名、状态、时间
   - 分页：简单的前端分页或后端分页

4. **按点位消费汇总**
   - `GET /api/v1/analytics/consumption/by-node` → 列表：点位名 + 收入 + 订单数

#### 7.4 Reports — `apps/admin/src/app/reports/page.tsx`

**布局**（两列：列表 + 详情）：

1. **操作栏**（顶部）
   - 日期选择器（默认今天）+ "生成日报"按钮
   - 点击按钮 → `POST /api/v1/reports/generate { date }` → loading → 刷新列表

2. **日报列表**（左侧）
   - `GET /api/v1/reports?from=...&to=...` → 按日期排列
   - 点击选中

3. **日报详情**（右侧）
   - 标题 + 日期 + summary
   - sections 逐个渲染（每 section 一个卡片：type icon + title + content）
   - **行动建议**：actionItems 列表，每条带优先级颜色标签（high=lychee红 / medium=water蓝 / low=ink灰）、category 中文、action 文字、deadline

#### 7.5 Infrastructure — `apps/admin/src/app/infrastructure/page.tsx`

**布局**：

1. **传感器读数面板**（5 列 grid）
   - 5 张卡片：降雨量(mm)、土壤湿度(%)、水位(m)、温度(°C)、湿度(%)
   - 每张卡片：图标 + 标签 + 数值（从 `SensorReading` 查最新值，或显示"硬件待接入"）
   - 无数据时：显示灰色占位文字

2. **控制指令队列**
   - 表格或列表
   - 无数据时：显示 `adminCopy.infrastructure.noCommandData`

3. **环境状态**（底部）
   - 列表显示 DEEPSEEK_API_KEY / QWEATHER_API_KEY / CRON_SECRET 的配置状态
   - 不要显示实际值，只显示"已配置"（绿点）/ "未配置"（灰点）

#### 7.6 Settings — `apps/admin/src/app/settings/page.tsx`

- API Base URL 显示
- DEEPSEEK_API_KEY / QWEATHER_API_KEY / CRON_SECRET 配置状态（绿/灰点，不显示值）
- 数据库状态：显示"已连接"（Prisma 连接成功即显示）

#### 7.7 Users — `apps/admin/src/app/users/page.tsx`

简单的占位页面：

```tsx
export default function UsersPage() {
  return (
    <div className="rounded-lg border border-stone bg-white p-6 shadow-soft">
      <h1 className="text-xl font-extrabold">用户管理</h1>
      <p className="mt-2 text-sm text-ink/54">用户管理模块将在下一阶段建设。</p>
    </div>
  )
}
```

---

## P0.8：共享组件

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 8.1 | `AdminStatCard` 样式与现有 Stat 一致 | 在 Dashboard 和 Orders 页面使用 → 视觉一致 |
| 8.2 | `AdminDataTable` 支持列定义 + 空状态 | 在 Nodes 和 Orders 页面使用 → 表头正确、空数据显示 emptyLabel |

### 指令

#### 1. 新建 `apps/admin/src/components/admin-stat-card.tsx`

```tsx
import type { ReactNode } from "react"

export function AdminStatCard({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-ink/40">{icon}</span> : null}
        <div className="text-2xl font-extrabold">{value}</div>
      </div>
      <div className="mt-1 text-xs font-semibold text-ink/54">{label}</div>
    </div>
  )
}
```

#### 2. 新建 `apps/admin/src/components/admin-data-table.tsx`

```tsx
"use client"

import type { ReactNode } from "react"
import { adminCopy } from "@admin/lib/admin-copy"

export interface TableColumn<T = Record<string, unknown>> {
  key: string
  label: string
  render?: (value: unknown, row: T) => ReactNode
  className?: string
}

export function AdminDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  selectedId,
  isLoading,
  emptyLabel,
}: {
  columns: TableColumn<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  selectedId?: string
  isLoading?: boolean
  emptyLabel?: string
}) {
  if (isLoading) {
    return <div className="p-5 text-sm font-semibold text-ink/54">{adminCopy.common.loading}</div>
  }

  if (rows.length === 0) {
    return <div className="p-5 text-sm font-semibold text-ink/54">{emptyLabel ?? adminCopy.common.noSelection}</div>
  }

  const gridCols = `grid-cols-[${columns.map((c) => c.className ?? "1fr").join("_")}]`

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-stone bg-white shadow-soft">
      {/* 表头 */}
      <div
        className={`grid ${gridCols} gap-3 border-b border-stone bg-ink px-4 py-3 text-xs font-bold text-white/72`}
        style={{ gridTemplateColumns: columns.map(() => "1fr").join(" ") }}
      >
        {columns.map((col) => (
          <div key={col.key}>{col.label}</div>
        ))}
      </div>

      {/* 表体 */}
      <div className="divide-y divide-stone">
        {rows.map((row, i) => {
          const id = String(row.id ?? i)
          const isSelected = selectedId === id

          return (
            <button
              key={id}
              className={
                isSelected
                  ? `grid w-full gap-3 bg-rice px-4 py-4 text-left`
                  : `grid w-full gap-3 px-4 py-4 text-left transition hover:bg-rice`
              }
              style={{ gridTemplateColumns: columns.map(() => "1fr").join(" ") }}
              onClick={() => onRowClick?.(row)}
              type="button"
            >
              {columns.map((col) => (
                <div key={col.key} className="min-w-0 truncate text-xs font-semibold text-ink/62">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                </div>
              ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

---

## 完整验证流程

按以下顺序执行，每步验证对应的验收项：

```bash
# 1. 安装依赖
pnpm install

# 2. 数据库迁移
cd packages/database
npx prisma db push
# → 验收：6 张新表出现在 PostgreSQL

# 3. Seed 数据
npx prisma db seed
# → 验收：17 个 SpaceNode 入库

# 4. 启动前台（已有功能回归）
cd apps/web
pnpm dev
# → 访问 http://localhost:3000
# → 验收：四境/路线/预约/认养/门票/反馈 全部正常

# 5. 启动后台
cd apps/admin
pnpm dev
# → 访问 http://localhost:3001

# 6. 验证 Admin Shell
# → 访问 / → 重定向到 /dashboard
# → 依次点击 7 个菜单 → 页面切换正常
# → 在 /feedback → 工单列表正常

# 7. 注入测试数据
# → POST /api/v1/presence (nodeId + peopleCount + dwellAvgMin)
# → POST /api/v1/orders (orderType + productId + productName + quantity + totalAmount + nodeId)

# 8. 验证评分
# → GET /api/v1/nodes/scores?date=today → 返回评分
# → Dashboard /nodes 页面 → 展示评分

# 9. 验证日报
# → POST /api/v1/reports/generate → 返回 AI 日报
# → /reports 页面 → 展示日报详情 + actionItems

# 10. 回归验证
# → 前台所有页面功能正常
# → /feedback 反馈管理正常
```

---

## 阶段 P1/P2 概要（保留，本次不执行）

### P1：设施控制闭环 + 深度分析

**验收目标**：
- IoT 传感器数据可上报并展示
- AI 控制决策引擎可用（传感器 + 天气 → 灌溉/泄洪/火险建议）
- 告警引擎：安全风险分 > 70、水位超阈值 → 生成 InfrastructureAlert
- Admin `/infrastructure` 页面展示真实传感器数据和控制指令

**任务**：
1. `POST /api/v1/infrastructure/sensors` — IoT 网关数据上报端点
2. `POST /api/v1/infrastructure/decide` — AI 控制决策端点（rule engine + AI 双层）
3. `packages/utils/src/alert-engine.ts` — 告警引擎
4. `packages/utils/src/control-engine.ts` — 控制决策引擎
5. Admin `/infrastructure` 页面激活真实数据

### P2：数字孪生 + 生态看板

**验收目标**：
- Leaflet/MapLibre GL 地图展示所有 SpaceNode 点位
- 图层切换：热力图（客流）、风险图（安全分）、消费图（收入）
- 生态历史趋势图
- IoT 设备管理界面

**任务**：
1. 地图组件集成 + SpaceNode 标注
2. 图层切换功能
3. 生态数据看板（温度/降水/土壤趋势）
4. IoT 设备注册/管理界面
5. `Device` + `DeviceReading` 数据模型
