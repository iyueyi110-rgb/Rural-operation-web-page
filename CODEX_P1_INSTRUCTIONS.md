# 走马村 AIGC 云脑 P1 — Codex 执行指令

## 架构约束（同 P0）

- 在现有 `d:\1\AIGC` monorepo 中扩展，不新建项目
- 前台 web 现有页面/组件/API 的**业务逻辑零破坏**
- 所有新增为增量：新表追加、新 API 追加、新页面追加
- `packages/utils` 保持无 DB 依赖

---

## P1 总体验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 树木档案可编辑、前台可查看叙事字段 | Admin 编辑山火记忆→前台树详情页展示 |
| 2 | 养护日志可录入、前台认养人可见 | Admin 录入日志→前台"我的认养"时间线更新 |
| 3 | 采摘预约流程走通 | 前台预约→后台确认→前台查看状态 |
| 4 | 水脉传感器 API 可用 | `POST /api/v1/infrastructure/sensors` → 201 → DB 存储 |
| 5 | 决策引擎输出建议 | `POST /api/v1/infrastructure/decide` → 返回 ControlCommand[] |
| 6 | 水利建议纳入日报 | 生成日报 → sections 含 infrastructure，actionItems 含水利建议 |
| 7 | 夜间滞留+拥堵检测 | 注入夜间 PresenceLog → alert API 返回告警 |
| 8 | 人流×消费交叉分析 | `/analytics/cross/flow-vs-spend` 返回转化率 |
| 9 | 天气动态接入评分 | 雨天时水边节点的 safetyRisk > 晴天时 |
| 10 | 院落活动管理 | Admin 创建活动 → 前台活动列表可见 → 可预订 |
| 11 | 前台 web 和现有 admin 功能不受影响 | 四境/路线/预订/认养/门票/反馈全部正常 |
| 12 | P0 所有功能不受影响 | Dashboard/Nodes/Orders/Reports/Infrastructure/Settings 全部正常 |

---

## P1.0：树木档案 + 养护日志 + 采摘预约

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 0.1 | 新增 5 个模型入库 | `db push` → `orchard_tree` `tree_care_log` `tree_adoption` `route_generation_log` `alert` 表存在 |
| 0.2 | 现有 `OrchardTree` 接口不变 | 前台 `/trees` 页面展示不变（API 改为查 DB 后数据一致） |
| 0.3 | 养护日志时间线 | 前台树详情展示养护日志按时间排列 |
| 0.4 | 采摘预约全流程 | 前台选树+日期→DB 记录→Admin 可见→状态可变更 |

### 数据库：新增 7 个模型

在 `schema.prisma` 现有模型之后追加（不动任何现有模型）：

```prisma
// ==== P1 树木与养护 ====

model OrchardTree {
  id              String        @id @default(cuid())
  treeCode        String        @unique
  species         String
  age             Int
  healthStatus    String        @default("good")
  blurredLocation String
  lat             Float?
  lng             Float?
  // 叙事字段 (P1 新增)
  fireMemory      String?       @db.Text
  newShootsRecord String?       @db.Text
  growthPhotos    Json          @default("[]")
  adoptStatus     String        @default("available")
  adoptPrice      Float?
  harvestSeason   String?
  fruitVariety    String?
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  careLogs        TreeCareLog[]
  adoptions       TreeAdoption[]

  @@map("orchard_tree")
}

model TreeCareLog {
  id        String      @id @default(cuid())
  treeId    String
  logType   String      // watering | pruning | fertilizing | pest_control | photo | harvest
  content   String      @db.Text
  imageUrl  String?
  operator  String
  createdAt DateTime    @default(now()) @map("created_at")
  tree      OrchardTree @relation(fields: [treeId], references: [id])

  @@index([treeId, createdAt])
  @@map("tree_care_log")
}

model TreeAdoption {
  id          String      @id @default(cuid())
  treeId      String
  plan        String
  adopterName String?
  adopterPhone String?
  status      String      @default("pending_payment")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  tree        OrchardTree @relation(fields: [treeId], references: [id])

  @@map("tree_adoption")
}

model RouteGenerationLog {
  id         String   @id @default(cuid())
  routeId    String
  duration   String
  audience   String
  weather    String
  provider   String   // deepseek | fallback
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("route_generation_log")
}

model Alert {
  id          String   @id @default(cuid())
  alertType   String   // night_linger | crowd | waterside | reverse_path | fire_risk | flood_risk
  nodeId      String?
  severity    String   // high | medium | low
  message     String   @db.Text
  status      String   @default("active") // active | acknowledged | resolved
  createdAt   DateTime @default(now()) @map("created_at")
  resolvedAt  DateTime?

  @@index([alertType, createdAt])
  @@map("alert")
}

model CourtyardActivity {
  id            String            @id @default(cuid())
  courtyardId   String
  activityType  String            // village_feast | food_class | study | workshop | exhibition | co_living
  title         String
  description   String            @db.Text
  maxCapacity   Int
  price         Float?
  scheduledDate String
  scheduledTime String
  status        String            @default("open")
  createdAt     DateTime          @default(now()) @map("created_at")
  bookings      ActivityBooking[]

  @@index([courtyardId, scheduledDate])
  @@map("courtyard_activity")
}

model ActivityBooking {
  id         String            @id @default(cuid())
  activityId String
  guestName  String
  guestPhone String
  guestCount Int
  status     String            @default("confirmed")
  createdAt  DateTime          @default(now()) @map("created_at")
  activity   CourtyardActivity @relation(fields: [activityId], references: [id])

  @@map("activity_booking")
}
```

执行：
```bash
cd packages/database && npx prisma db push
```

### 修改 contracts

在 `packages/contracts/src/index.ts` 末尾追加（不动现有类型）：

```ts
// ==== P1 新增 ====

export type TreeCareLogType = "watering" | "pruning" | "fertilizing" | "pest_control" | "photo" | "harvest"
export type ActivityType = "village_feast" | "food_class" | "study" | "workshop" | "exhibition" | "co_living"
export type AlertType = "night_linger" | "crowd" | "waterside" | "reverse_path" | "fire_risk" | "flood_risk"

export interface OrchardTreeData {
  id: string
  treeCode: string
  species: string
  age: number
  healthStatus: string
  blurredLocation: string
  lat?: number
  lng?: number
  fireMemory?: string
  newShootsRecord?: string
  growthPhotos: string[]
  adoptStatus: string
  adoptPrice?: number
  harvestSeason?: string
  fruitVariety?: string
}

export interface TreeCareLogData {
  id: string
  treeId: string
  logType: TreeCareLogType
  content: string
  imageUrl?: string
  operator: string
  createdAt: string
}

export interface TreeAdoptionData {
  id: string
  treeId: string
  plan: string
  adopterName?: string
  adopterPhone?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AlertData {
  id: string
  alertType: AlertType
  nodeId?: string
  severity: "high" | "medium" | "low"
  message: string
  status: "active" | "acknowledged" | "resolved"
  createdAt: string
  resolvedAt?: string
}

export interface CourtyardActivityData {
  id: string
  courtyardId: string
  activityType: ActivityType
  title: string
  description: string
  maxCapacity: number
  price?: number
  scheduledDate: string
  scheduledTime: string
  status: string
}

export interface ActivityBookingData {
  id: string
  activityId: string
  guestName: string
  guestPhone: string
  guestCount: number
  status: string
  createdAt: string
}
```

同时更新 `ReportSectionData.type` 联合类型，追加 `"infrastructure"`：
```ts
export interface ReportSectionData {
  type: "visitor_flow" | "consumption" | "alerts" | "feedback" | "weather" | "infrastructure"
  title: string
  content: string
}
```

### Seed：初始化 OrchardTree

从 `trees-data.ts` 的 `orchardTreeOptions`（3 棵树：lz018/lz026/lz041）提取数据，写入 `OrchardTree` 表。新建 `packages/database/prisma/seed-trees.ts`，在 `seed.ts` 中调用。

### API：树木相关

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/trees` | GET | 返回所有树木列表（替代静态 mock） |
| `GET /api/v1/trees/[code]` | GET | 单棵树详情 + 养护日志 |
| `POST /api/v1/trees/[code]/care-logs` | POST | 录入养护日志（admin 调用） |
| `POST /api/v1/tree-adoptions` | POST | **改为持久化**到 `TreeAdoption` 表，校验 treeId 存在性 |
| `GET /api/v1/tree-adoptions?adopterPhone=X` | GET | 查询认养记录 |
| `POST /api/v1/harvest-bookings` | POST | 采摘预约：treeId + date + guestCount |

> `POST /api/v1/tree-adoptions` 是**修改现有文件**——把 mock 返回改为 Prisma create。这是 P1 中唯一需要修改的现有 API 文件。

### 前台改动

| 文件 | 改动 |
|------|------|
| `apps/web/src/lib/trees-data.ts` | 添加 `fetch` 版本的数据获取函数，保留静态数据作为 fallback |
| `apps/web/src/app/[locale]/trees/page.tsx` | 认养后显示养护日志更新 |
| `apps/web/src/app/[locale]/me/page.tsx` | "我的认养"展示养护日志时间线、采摘季提醒横幅 |
| 新建 `apps/web/src/app/[locale]/trees/[code]/page.tsx` | 单棵树叙事页：档案信息 + 山火记忆/新芽记录 + 养护日志时间线 + 认养/采摘入口 |

### Admin 改动

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/trees/page.tsx` | 树木管理：列表 + 编辑叙事字段 + 上传照片 + 录入养护日志 |
| 新建 `apps/admin/src/app/harvest/page.tsx` | 采摘预约管理：列表 + 确认/完成状态变更 |
| `apps/admin/src/lib/admin-copy.ts` | 新增菜单项 `trees: "树木管理"`, `harvest: "采摘管理"`；新增对应文案（trees/harvest/careLog 等） |
| `apps/admin/src/components/admin-sidebar.tsx` | 新增菜单项（在 orders 和 reports 之间或单独分组） |

---

## P1.1：水脉可操作系统

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1.1 | 传感器 API 可用 | `POST /api/v1/infrastructure/sensors` → 201 → DB 存储 |
| 1.2 | 决策引擎输出有效建议 | `POST /api/v1/infrastructure/decide` → 返回 irrigation/flood_alert/fire_alert 建议 |
| 1.3 | AI 不可用时规则层仍输出 | 不配 DEEPSEEK_API_KEY 时调 decide → 仍返回基于规则的建议 |
| 1.4 | Infrastructure 页面激活 | `/infrastructure` 展示传感器读数（非占位） |
| 1.5 | 水利纳入日报 | 生成日报→sections 有 infrastructure→actionItems 有水利建议 |

### 新建 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `POST /api/v1/infrastructure/sensors` | POST | IoT 数据上报，写入 `SensorReading`。加 `X-API-Key` header 鉴权 |
| `GET /api/v1/infrastructure/sensors/latest` | GET | 各传感器最新一条读数 |
| `POST /api/v1/infrastructure/decide` | POST | AI 控制决策 → `ControlCommand[]` |
| `GET /api/v1/infrastructure/alerts` | GET | 活跃告警列表 |

### 新建 `apps/web/src/lib/control-engine.ts`

纯逻辑模块（规则层），import 到 web/lib（不含 DB 依赖的纯函数部分可放 utils）：

```
输入: {
  sensors: SensorReading[]   // 最新一批传感器读数
  weather: WeatherSummary    // 当日天气
  forecast?: string          // 明日天气预报文本
  nodes: SpaceNode[]         // 水边节点
}

规则层输出: ControlSuggestion[]
- soil_moisture < 30% AND forecast_no_rain → { type: "irrigation", priority: "high", reason: "..." }
- water_level > 阈值 → { type: "flood_alert", priority: "critical", reason: "..." }
- temperature > 35°C AND humidity < 20% AND forecast_no_rain → { type: "fire_alert", priority: "high" }
- forecast_rain AND soil_moisture > 60% → { type: "rain_delay", priority: "medium" }

AI 层 (DeepSeek):
- 传入规则层输出 + 全部 sensor 数据 + weather
- 返回 nuanced 建议（"虽然土壤湿度低，但预报明日下午有雨，建议延迟灌溉至明日评估"）
- 若 AI 不可用，回退到规则层输出
```

### Admin: Infrastructure 页面激活

将 `apps/admin/src/app/infrastructure/page.tsx` 从纯占位改为真实数据：

- 5 张传感器卡片：`GET /api/v1/infrastructure/sensors/latest` → 显示最新数值
- 无数据时保留"硬件待接入"占位（不显示 "0"）
- 控制指令队列：`GET /api/v1/infrastructure/alerts` + 手动触发 `POST /api/v1/infrastructure/decide`
- "执行决策"按钮：调 decide → 展示建议列表

### 日报增强

修改 `apps/web/src/lib/report-generator.ts`：

- `generateDailyReport` 中新增一步：`POST /api/v1/infrastructure/decide`（内部调用，非 HTTP）
- sections 新增 `{ type: "infrastructure", title: "设施调度", content: "..." }`
- actionItems 自动纳入高优先级水利建议

---

## P1.2：感知增强 + 告警引擎

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 2.1 | 夜间滞留检测 | 注入 timestamp>18:00 的 PresenceLog → `GET /api/v1/alerts?type=night_linger` 返回告警 |
| 2.2 | 拥堵检测 | 注入 peopleCount/capacity>0.8 的数据 → 告警生成 |
| 2.3 | 人流×消费交叉分析 | `GET /api/v1/analytics/cross/flow-vs-spend` → 返回各节点转化率 |
| 2.4 | Admin 告警页面 | `/alerts` 展示告警列表 + 状态变更 |

### 新建 `apps/web/src/lib/alert-engine.ts`

```ts
// 检测逻辑：巡查 PresenceLog → 生成 Alert
// 去重：同一节点+同一类型+当日已有 active 告警 → 不重复生成
export async function runAlertChecks(date: string): Promise<Alert[]>

// 各检测器：
// - detectNightLingering(presenceLog): timestamp>18:00 AND peopleCount>0
// - detectCrowding(log, node): peopleCount/capacity > 0.8
// - detectWatersideRisk(log, node, weather): watersideRisk>0.3 AND weather="rainy"
// - detectReversePath(logs, routes): 连续 log 的 nodeId 在 route.waypoints 中逆序出现
```

### 新建 `apps/web/src/lib/cross-analytics.ts`

```ts
// 人流×消费交叉分析
export async function computeFlowVsSpend(date: string): Promise<CrossAnalyticsRow[]>
// 输出: [{ nodeId, nodeName, peopleCount, revenue, orderCount, conversionRate, roi }]
// conversionRate = orderCount / peopleCount (每个节点)
// roi = revenue / peopleCount
```

### 新增 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/alerts?type=X&date=Y&status=active` | GET | 告警列表 |
| `PATCH /api/v1/alerts` | PATCH | 告警状态变更（acknowledged/resolved） |
| `GET /api/v1/analytics/cross/flow-vs-spend?date=Y` | GET | 交叉分析表 |

### Admin 改动

| 页面 | 改动 |
|------|------|
| Dashboard 告警区 | 从安全风险分筛选 → `GET /api/v1/alerts?status=active` 实时告警 |
| 新建 `/alerts` 页面 | 告警列表 + 类型筛选 + 状态变更 |
| 新建 `/analytics` 页面 | 交叉分析表：节点客流 vs 消费 vs 转化率 |
| Nodes 详情增强 | 单节点 30 天趋势 + 客流 vs 消费对比 |

---

## P1.3：院落运营

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 3.1 | Admin 可创建/编辑活动 | `/activities` 页面 CRUD 操作 |
| 3.2 | 前台活动列表可见 | `/activities` 展示活动列表 |
| 3.3 | 预订流程走通 | 前台预订→DB 记录→GuestCount 不超 maxCapacity |
| 3.4 | 满员/取消状态不可预订 | full/cancelled 活动预订按钮 disabled |

### 新建 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/activities` | GET | 活动列表（?courtyardId=X&date=Y） |
| `POST /api/v1/activities` | POST | 创建活动（admin） |
| `PATCH /api/v1/activities` | PATCH | 编辑活动（admin） |
| `POST /api/v1/activity-bookings` | POST | 预订活动，校验 capacity |
| `GET /api/v1/activity-bookings?activityId=X` | GET | 预订列表 |

### 前台改动

| 文件 | 改动 |
|------|------|
| `apps/web/src/app/[locale]/booking/page.tsx` | 院落详情增加"近期活动"模块 |
| 新建 `apps/web/src/app/[locale]/activities/page.tsx` | 活动广场：类型筛选 + 日期筛选 + 预订按钮 |

### Admin 改动

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/activities/page.tsx` | 活动 CRUD + 预订列表 |
| `apps/admin/src/app/orders/page.tsx` | orderType 筛选增加 `activity_booking` |

---

## P1.4：天气接入评分引擎

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 4.1 | weatherCondition 非硬编码 | 晴天/雨天/高温时评分不同 |
| 4.2 | QWeather 不可用时回退 | 不配 API key 时不报错，默认 "sunny" |

### 改动

修改 `apps/web/src/lib/node-scoring.ts`：

```ts
// 当前 (P0):
const weatherCondition = "sunny"

// P1 改为:
import { getWeatherCondition } from "@web/lib/weather"
const weatherCondition = await getWeatherCondition(date)
```

在 `apps/web/src/lib/weather.ts` 中新增：

```ts
export async function getWeatherCondition(date: string): Promise<"sunny" | "rainy" | "hot"> {
  try {
    const summary = await getWeatherSummary()
    const text = summary.summary + summary.temperature
    if (/雨|rain/i.test(text)) return "rainy"
    if (/晴|sunny|clear/i.test(text) && Number.parseFloat(summary.temperature) > 32) return "hot"
    return "sunny"
  } catch {
    return "sunny" // fallback
  }
}
```

---

## P1.5：不可完成项的降级方案

| # | 原需求 | 降级方案 | 改动 |
|:--:|------|---------|------|
| 9/12 | 节气提醒推送 | 前台"我的认养"页面站内横幅 | `me/page.tsx` 加提醒组件 |
| 14/30 | 在线支付 | 意向下单 + 线下核销 | `UnifiedOrder.status` 加 `"pending_offline"` 状态 |
| 32/34 | 硬件传感器 | 软件全就绪，数据支持手动录入 | infrastructure 页面加"手动录入"入口 |
| 53/54 | 地图热力图 | Admin 用排名表格替代 | `/analytics` 页面表格展示 |

---

## 执行顺序

```
P1.4 天气接入    (1个文件改动, 30分钟)
    ↓
P1.0 树木档案    (7个模型 + 6个API + 前台3页面 + Admin 2页面, 主体)
    ↓
P1.1 水脉操作系统 (4个API + control-engine + infrastructure激活, 后台核心)
    ↓
P1.2 感知增强    (alert-engine + cross-analytics + 3个API + Admin 2页面)
    ↓
P1.3 院落运营    (活动模型 + 5个API + 前台1页面 + Admin 1页面)
    ↓
P1.5 降级方案    (各页面小改动)
```

---

## 完整验证流程

```bash
# 1. 数据库
cd packages/database && npx prisma db push
# → 验收: 7 张新表出现在 PostgreSQL

# 2. Seed
npx prisma db seed
# → 验收: 3 棵荔枝树入库 + 17 个 SpaceNode 仍在

# 3. Type check
cd apps/web && pnpm type-check
cd apps/admin && pnpm type-check
# → 验收: 零错误

# 4. 前台回归 (:3000)
# → 四境/路线/预约/认养/门票/反馈/me/privacy 全部正常
# → 新增: /trees/[code] 树详情页、/activities 活动广场

# 5. 后台验收 (:3001)
# → 7 个 P0 菜单正常 + 新增菜单正确
# → /trees 树木管理可编辑叙事字段
# → /infrastructure 传感器卡片从占位→真实数据
# → /alerts 告警列表
# → /analytics 交叉分析表
# → /activities 活动管理

# 6. API 验收
# → POST /api/v1/infrastructure/sensors → 201
# → POST /api/v1/infrastructure/decide → 返回建议列表
# → GET /api/v1/alerts?status=active → 返回告警
# → GET /api/v1/analytics/cross/flow-vs-spend → 返回转化率
# → POST /api/v1/trees/xxx/care-logs → 201
# → POST /api/v1/harvest-bookings → 201
```
