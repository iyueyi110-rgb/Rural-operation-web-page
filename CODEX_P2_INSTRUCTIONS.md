# 走马村 AIGC 云脑 P2 — Codex 执行指令

## 架构约束（同 P0/P1）

- 在现有 `d:\1\AIGC` monorepo 中扩展，不新建项目
- 前台 web 现有页面/组件/API **零破坏**
- 所有新增为增量：新表追加、新 API 追加、新页面追加
- `packages/utils` 保持无 DB 依赖
- P0/P1 模型和 API 不改

---

## P2 总体验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 地图页面展示 17 个 SpaceNode 点位 | `/map` 页面加载 Leaflet 地图，所有节点标注可见 |
| 2 | 热力图/风险图/消费图三种图层可切换 | 图层按钮切换 → 节点颜色/大小按数据变化 |
| 3 | Visitor 模型可用，逆向穿行检测激活 | 注入带 visitorId 的 PresenceLog → `GET /api/v1/alerts?type=reverse_path` 返回告警 |
| 4 | QWeather 灾害预警接入告警 | `GET /api/v1/weather/alerts` 返回预警 → `/alerts` 页面展示 |
| 5 | IoT 设备管理可用 | Admin `/devices` 可注册设备、查看状态、查看读数 |
| 6 | 农产品可管理、前台可浏览 | Admin 创建 Product → `/products` 页面展示 → 意向下单 |
| 7 | 树木照片可上传 | Admin 树木管理上传照片 → 前台树详情展示 |
| 8 | 路线热度分析可用 | `/analytics` 路线 tab 展示各路线调用次数 + AI vs fallback |
| 9 | 水脉告警联动路线生成 | 某节点 safetyRisk>70 → 路线生成时该节点被降权 |
| 10 | 前台 web 和现有 P0/P1 功能不受影响 | 所有现有页面和 API 正常 |

---

## P2.0：地图可视化

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 0.1 | Leaflet 地图加载 | `/map` 页面无报错，地图瓦片正常加载 |
| 0.2 | 17 个节点标注 | 所有 SpaceNode 点位显示在地图上 |
| 0.3 | 点击弹窗 | 点击节点 → 弹窗显示名称 + 今日评分 + 客流 |
| 0.4 | 图层切换 | 热力/风险/消费三个图层按钮可切换 |

### 技术选型

使用 **Leaflet** + **react-leaflet**（免费、无 API key、轻量）：

```bash
cd apps/admin && pnpm add leaflet react-leaflet @types/leaflet
```

### Admin 改动

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/map/page.tsx` | 地图页面：Leaflet 地图容器 + 图层切换控件 + 节点弹窗 |
| 新建 `apps/admin/src/components/admin-map.tsx` | 地图组件封装：节点标注层、热力图层、风险图层、消费图层 |
| 修改 `apps/admin/src/components/admin-sidebar.tsx` | 新增菜单项 `map: "地图监控"`，图标 `Map`（lucide） |
| 修改 `apps/admin/src/lib/admin-copy.ts` | 新增 `map` 文案（title/noData/layers 等），新增菜单项 |

### 地图组件数据流

```
GET /api/v1/nodes → 17 个 SpaceNode（含 lat/lng）
GET /api/v1/nodes/scores?date=today → 评分（用于风险图层颜色）
GET /api/v1/analytics/cross/flow-vs-spend?date=today → 消费（用于消费图层大小）
GET /api/v1/presence?latest=true → 客流（用于热力图层）
```

### 图层实现

| 图层 | 数据源 | 可视化方式 |
|------|--------|-----------|
| 客流热力 | `PresenceLog.peopleCount` | 节点圆半径 = peopleCount，颜色 = 红色渐变 |
| 安全风险 | `NodeDailyScore.safetyRisk` | 节点圆颜色 = 绿(<30) / 黄(30-70) / 红(>70) |
| 消费分布 | `CrossAnalytics.revenue` | 节点圆半径 = revenue，颜色 = 蓝色渐变 |

### ⚠️ 注意事项

- Leaflet CSS 需要在 `layout.tsx` 或 `globals.css` 中引入：`import "leaflet/dist/leaflet.css"`
- 默认地图中心设为走马村坐标：`[29.849, 106.318]`，缩放级别 14
- 节点没有 lat/lng 时（seed 中有 17 个全有坐标，但后续可能新增无坐标节点）：跳过不标注，不报错
- `react-leaflet` 的 `MapContainer` 需要明确 height（`<div style={{ height: "calc(100vh - 120px)" }}>`），否则地图高度为 0
- 图层切换按钮放在地图左上角 overlay，不要挡住地图

---

## P2.1：Visitor 模型 + 逆向穿行 + 天气预警

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1.1 | Visitor 模型可用 | `prisma.visitor.create()` 成功 |
| 1.2 | PresenceLog 可关联 visitorId | POST presence 时传 visitorId → DB 关联正确 |
| 1.3 | 逆向穿行检测 | 同一 visitorId 的 nodeId 序列逆序时 → alert 生成 |
| 1.4 | QWeather 预警接入 | QWEATHER_API_KEY 配置 → `GET /api/v1/weather/alerts` 返回预警数据 → `/alerts` 展示 |

### Schema

在 `schema.prisma` 末尾追加：

```prisma
model Visitor {
  id        String   @id @default(cuid())
  fingerprint String @unique  // 浏览器指纹/设备标识
  label     String?           // 可选昵称
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("visitor")
}
```

修改 `PresenceLog`（追加一个可选字段，不动现有字段）：

```prisma
model PresenceLog {
  // ... 现有字段保持不变 ...
  visitorId  String?  // 追加此行
  // ...
}
```

执行：
```bash
cd packages/database && npx prisma db push
```

### Contracts

追加：

```ts
export interface VisitorData {
  id: string
  fingerprint: string
  label?: string
  createdAt: string
}

export interface WeatherAlertData {
  id: string
  type: "storm" | "rainstorm" | "heatwave" | "typhoon" | "other"
  level: string        // 蓝/黄/橙/红
  title: string
  content: string
  publishTime: string
}
```

### alert-engine 改动

修改 `apps/web/src/lib/alert-engine.ts`：

在文件顶部新增 import：
```ts
import { routeOptions } from "@web/lib/routes-data"
```

**改动 1**：激活 `reverse_path` 检测器

```ts
// 在 runAlertChecks 中，现有三个检测器之后追加：

// 逆向穿行检测（基于 visitorId）
const visitorPaths = new Map<string, Array<{ nodeId: string; timestamp: Date }>>()
for (const log of logs) {
  if (!log.visitorId) continue
  const path = visitorPaths.get(log.visitorId) || []
  path.push({ nodeId: log.nodeId, timestamp: log.timestamp })
  visitorPaths.set(log.visitorId, path)
}

// 从 routes-data 提取正向顺序（注意：routeOptions 已在文件顶部 import）
const waypointOrder = new Map<string, number>()
for (const route of routeOptions) {
  route.waypoints.forEach((wp, i) => {
    if (!waypointOrder.has(wp)) waypointOrder.set(wp, i)
  })
}

for (const [, path] of visitorPaths) {
  if (path.length < 2) continue
  const orders = path
    .map((p) => {
      const node = nodeMap.get(p.nodeId)
      return node ? (waypointOrder.get(node.nameKey) ?? -1) : -1
    })
    .filter((o) => o >= 0)
  for (let i = 0; i < orders.length - 1; i++) {
    if (orders[i] - orders[i + 1] > 3) {
      const node = nodeMap.get(path[i + 1].nodeId)
      if (!node) continue
      created.push(
        await createAlertIfAbsent({
          alertType: "reverse_path",
          nodeId: node.id,
          severity: "low",
          message: `${node.slug} 检测到逆向穿行，建议检查导视。`,
          dayStart: start,
        }),
      )
      break
    }
  }
}
```

**改动 2**：新增天气预警告警

在 `runAlertChecks` 中调用新函数：

```ts
const weatherAlerts = await fetchWeatherAlerts()
for (const alert of weatherAlerts) {
  created.push(
    await createAlertIfAbsent({
      alertType: alert.type === "rainstorm" || alert.type === "storm" ? "flood_risk" : "fire_risk",
      severity: alert.level === "红" || alert.level === "橙" ? "high" : "medium",
      message: `${alert.title}：${alert.content}`,
      dayStart: start,
    }),
  )
}
```

### 新建 `apps/web/src/lib/weather-alerts.ts`

```ts
import "server-only"

export interface QWeatherWarning {
  id: string
  sender?: string
  pubTime: string
  title: string
  description: string
  severity: string   // 蓝/黄/橙/红
  urgency: string
  type: string       // 11B01=暴雨, 11B03=高温, etc.
}

export async function fetchWeatherAlerts(): Promise<Array<{
  type: "storm" | "rainstorm" | "heatwave" | "typhoon" | "other"
  level: string
  title: string
  content: string
}>> {
  const apiKey = process.env.QWEATHER_API_KEY
  const locationId = process.env.QWEATHER_LOCATION_ID ?? "101040100"

  if (!apiKey) return []

  try {
    const host = process.env.QWEATHER_API_HOST ?? "https://devapi.qweather.com"
    const response = await fetch(`${host}/v7/warning/now?location=${locationId}&key=${apiKey}`)
    if (!response.ok) return []
    const payload = (await response.json()) as { warning?: QWeatherWarning[] }

    return (payload.warning ?? []).map((w) => ({
      type: mapWarningType(w.type),
      level: w.severity,
      title: w.title,
      content: w.description,
    }))
  } catch {
    return []
  }
}

function mapWarningType(type: string): "storm" | "rainstorm" | "heatwave" | "typhoon" | "other" {
  if (type.startsWith("11B01") || type.startsWith("11B02")) return "rainstorm"
  if (type.startsWith("11B03")) return "heatwave"
  if (type.startsWith("11B04") || type.startsWith("11B05")) return "storm"
  if (type.startsWith("11B06") || type.startsWith("11B07")) return "typhoon"
  return "other"
}
```

### 新建 API

| 端点 | 文件 | 功能 |
|------|------|------|
| `GET /api/v1/weather/alerts` | `apps/web/src/app/api/v1/weather/alerts/route.ts` | 调 `fetchWeatherAlerts()`，返回预警列表 |

### Admin 改动

| 文件 | 改动 |
|------|------|
| `/alerts` 页面 | 告警列表增加 weather 类型筛选 |
| `/alerts` 页面 | 告警等级（high/medium/low）加上天气预警特有的"红/橙/黄/蓝"标签显示 |

---

## P2.2：IoT 设备管理

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 2.1 | 设备注册 | Admin 创建设备 → `prisma.device.count()` +1 |
| 2.2 | 数据上报 | `POST /api/v1/devices/readings` → DB 存储 |
| 2.3 | 设备离线检测 | 设备 `lastSeen` > 30 分钟 → 日报 actionItems 含巡检建议 |
| 2.4 | Admin 设备页面 | `/devices` 展示设备列表 + 状态 + 读数图表 |

### Schema

在 `schema.prisma` 末尾追加：

```prisma
model Device {
  id         String   @id @default(cuid())
  deviceId   String   @unique
  type       String   // soil_sensor | water_sensor | weather_station | valve | camera
  label      String
  location   String?
  nodeId     String?
  status     String   @default("online")  // online | offline | maintenance
  lastSeenAt DateTime?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  readings   DeviceReading[]
  node       SpaceNode? @relation(fields: [nodeId], references: [id])

  @@map("device")
}

model DeviceReading {
  id        String   @id @default(cuid())
  deviceId  String
  metric    String   // temperature | humidity | soil_moisture | water_level | valve_position | battery
  value     Float
  unit      String
  createdAt DateTime @default(now()) @map("created_at")
  device    Device   @relation(fields: [deviceId], references: [id])

  @@index([deviceId, createdAt])
  @@map("device_reading")
}
```

### API

| 端点 | 文件 | 功能 |
|------|------|------|
| `POST /api/v1/devices/readings` | `.../devices/readings/route.ts` | 设备批量上报读数。鉴权：`X-API-Key` |
| `GET /api/v1/devices` | `.../devices/route.ts` | 设备列表，含最新读数 |
| `GET /api/v1/devices/[deviceId]/readings` | `.../devices/[deviceId]/readings/route.ts` | 单设备读数历史 |
| `POST /api/v1/devices` | `.../devices/route.ts` | Admin 注册设备。鉴权：`X-Admin-Token` |
| `PATCH /api/v1/devices` | `.../devices/route.ts` | 更新设备信息/状态 |

### Contracts

追加：

```ts
export interface DeviceData {
  id: string
  deviceId: string
  type: "soil_sensor" | "water_sensor" | "weather_station" | "valve" | "camera"
  label: string
  location?: string
  nodeId?: string
  status: "online" | "offline" | "maintenance"
  lastSeenAt?: string
}

export interface DeviceReadingData {
  id: string
  deviceId: string
  metric: string
  value: number
  unit: string
  createdAt: string
}

export interface ProductData {
  id: string
  name: string
  category: "lychee" | "longan" | "drink" | "gift" | "workshop"
  price?: number
  description?: string
  imageUrl?: string
  nodeId?: string
  status: "active" | "inactive"
}
```

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/devices/page.tsx` | 设备列表 + 状态筛选 + 在线/离线指示 + 点击查看读数折线图 |
| 修改 `apps/admin/src/components/admin-sidebar.tsx` | 新增菜单项 `devices: "设备管理"`，图标 `CircuitBoard` |
| 修改 `apps/admin/src/lib/admin-copy.ts` | 新增 `devices` 文案 |

### 日报增强

修改 `apps/web/src/lib/report-generator.ts`：

```ts
// 设备离线检测
const offlineDevices = await prisma.device.findMany({
  where: {
    status: { not: "maintenance" },
    lastSeenAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // 30分钟无心跳
  },
})

const deviceActions = offlineDevices.map((device) => ({
  priority: "high" as const,
  category: "facility" as const,
  action: `设备 ${device.label}（${device.deviceId}）超过30分钟无心跳，建议现场巡检。`,
  deadline: "今日内",
}))

// 合并到现有 actionItems，按 action 文本去重
actionItems = [...actionItems, ...deviceActions]
  .filter((item, index, items) => items.findIndex((c) => c.action === item.action) === index)
```

### ⚠️ 注意事项

- 设备上报 API 的 `X-API-Key` 鉴权模式与 `infrastructure/sensors` 一致
- 设备离线判断：用 `lastSeenAt` 而非 `status` 字段（`status` 是人工维护的状态，`lastSeenAt` 是心跳检测）
- 读数折线图：P2 不引入图表库（如 recharts），用简单 CSS 柱状图或文字趋势描述

---

## P2.3：农产品模型 + 消费闭环

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 3.1 | 农产品可管理 | Admin CRUD Product → DB 存储 |
| 3.2 | 前台可浏览 | `/products` 页面展示商品列表 |
| 3.3 | 意向下单 | 点击"意向购买" → 生成 `pending_offline` 订单 |
| 3.4 | 日报含农产品排行 | 生成日报 → metrics 含 `productRanking` |

### Schema

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  category    String   // lychee | longan | drink | gift | workshop
  price       Float?
  description String?  @db.Text
  imageUrl    String?
  nodeId      String?
  status      String   @default("active")  // active | inactive
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  node        SpaceNode? @relation(fields: [nodeId], references: [id])

  @@map("product")
}
```

### API

| 端点 | 功能 |
|------|------|
| `GET /api/v1/products?category=X` | 产品列表 |
| `POST /api/v1/products` | 创建产品（Admin，`X-Admin-Token`） |
| `PATCH /api/v1/products` | 编辑产品 |
| ~~支付~~ | 不接入支付。`UnifiedOrder` 的 `status: "pending_offline"` 表示线下核销 |

> 同步修改 `apps/web/src/app/api/v1/orders/route.ts`：`orderTypes` 数组追加 `"product_order"`。

### 前台

| 文件 | 改动 |
|------|------|
| 新建 `apps/web/src/app/[locale]/products/page.tsx` | 商品网格：照片 + 名称 + 价格 + "意向购买"按钮 |
| 修改 i18n（`messages/zh-CN.json`） | 新增 `products` 命名空间 |

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/products/page.tsx` | 产品列表 + 新建/编辑表单 |
| 修改 sidebar + admin-copy | 新增菜单项 |

### 日报增强

修改 `report-generator.ts`：按 `productName` 聚合当日 `UnifiedOrder`，生成产品排行并写入日报：

```ts
const productRanking = await prisma.unifiedOrder.groupBy({
  by: ["productName"],
  where: { createdAt: { gte: start, lte: end } },
  _count: { _all: true },
  _sum: { totalAmount: true },
  orderBy: { _count: { _all: "desc" } },
  take: 10,
})

// 写入 metrics
metrics.productRanking = productRanking

// 在 sections 中追加消费分析（如尚无此 section）
const consumptionSection = {
  type: "consumption",
  title: "消费分析",
  content: productRanking.length > 0
    ? `本周热销：${productRanking.map((p) => `${p.productName}(${p._count._all}单 ¥${p._sum.totalAmount ?? 0})`).join("、")}`
    : "暂无产品消费数据。",
}
```

---

## P2.4：树木档案完善

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 4.1 | Admin 可上传树木照片 | 上传→`/public/uploads/trees/` → URL 写入 `growthPhotos` |
| 4.2 | 前台展示照片网格 | 树详情页展示 `growthPhotos` 图片 |
| 4.3 | 果实去向可录入 | Admin 录入→前台溯源时间线展示 |

### Schema 改动

`HarvestBooking` 追加字段：

```prisma
model HarvestBooking {
  // ... 现有字段保持不变 ...
  fruitDestination String?  // 追加：果实去向（加工/销售/赠送/自用）
  destinationNote  String?  // 追加：去向备注
  // ...
}
```

### Admin 改动

修改 `apps/admin/src/app/trees/page.tsx`：

- 树木编辑表单中的 `growthPhotos`：从手动输入 URL → 改为 `<input type="file" multiple>` + fetch `/api/v1/upload`（新建上传 API）
- 采摘管理详情中增加"果实去向"编辑

### API

| 端点 | 功能 |
|------|------|
| `POST /api/v1/upload` | 文件上传。鉴权：`X-Admin-Token`。保存到 `/public/uploads/trees/`，返回 URL |

### 前台改动

修改 `apps/web/src/app/[locale]/trees/[code]/page.tsx`：
- 照片网格：`growthPhotos.map(url => <img src={url} />)`
- 果实去向时间线：从 `HarvestBooking` 读取 `fruitDestination`

---

## P2.5：路线 + 水脉 + 告警联动

### 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 5.1 | 六站叙事路线模板存在 | `selectRouteOption` 可返回 `"narrative-six-stops"` 路线 |
| 5.2 | 路线热度分析 | `/analytics` 路线 tab 展示各 routeId 调用次数 |
| 5.3 | 高风险节点降权 | 某节点 safetyRisk>70 → 路线生成 AI prompt 中该节点标记为"避开" |
| 5.4 | 告警统一视图 | `/alerts` 页面同时展示行为告警 + 传感器告警 + 天气告警 |

### 路线热度分析

修改 `apps/admin/src/app/analytics/page.tsx`：
- 新增 tab：路线排行
- `GET /api/v1/analytics/routes/ranking?days=30` → 新建 API
- 展示：routeId、调用次数、AI 占比、fallback 占比

新建 API：`apps/web/src/app/api/v1/analytics/routes/ranking/route.ts`

```ts
// GET: prisma.routeGenerationLog.groupBy({ by: ["routeId"], _count: true })
// 同时统计 provider="deepseek" vs provider!="deepseek" 比例
```

### 路线生成安全过滤

修改 `apps/web/src/app/api/v1/routes/generate/route.ts`：

在构建 AI prompt 之前：
```ts
// 获取高风险节点
const highRiskNodes = await prisma.nodeDailyScore.findMany({
  where: { date: getChinaDateString(), safetyRisk: { gt: 70 } },
  include: { node: true },
})

// 在高风险节点的 waypoint 上追加 "（当前安全风险较高，建议避开）"
const riskSlugs = new Set(highRiskNodes.map(s => s.node.slug))
```

### 六站叙事路线

修改 `apps/web/src/lib/routes-data.ts`，追加一条新路线：

```ts
{
  id: "narrative-six-stops",
  duration: "oneDay",
  audience: "regular",
  weather: "sunny",
  titleKey: "plans.narrativeSixStops.title",
  summaryKey: "plans.narrativeSixStops.summary",
  totalTimeKey: "plans.narrativeSixStops.totalTime",
  mobilityKey: "plans.narrativeSixStops.mobility",
  weatherKey: "plans.narrativeSixStops.weather",
  waypoints: [
    "waypoints.visitorCenter",       // 第一站：火后新芽
    "waypoints.lycheeGarden",        // 第二站：荔田共生
    "waypoints.ancientRoad",         // 第三站：古道叙事
    "waypoints.waterfrontRest",      // 第四站：龙溪水脉
    "waypoints.ridgeCourtyard",      // 第五站：岭上院落
    "waypoints.resilienceWorkshop",  // 第六站：云脑后台（韧谷研学境）
  ],
  reservationNodes: ["reservationNodes.villageMeal", "reservationNodes.courtyardTea"],
  rainFallbackKey: "plans.narrativeSixStops.rainFallback",
  noticeKey: "plans.narrativeSixStops.notice",
}
```

同时在 `messages/zh-CN.json` 中追加对应的 i18n keys。

### 告警统一视图

修改 `apps/admin/src/app/alerts/page.tsx`：

- 当前只从 `GET /api/v1/alerts` 获取行为告警
- 改为同时调 `GET /api/v1/alerts` + `GET /api/v1/infrastructure/alerts`（传感器阈值告警）+ `GET /api/v1/weather/alerts`（天气预警）
- 三个来源合并展示，每行标注来源标签（行为/传感器/天气）
- 新增告警类型筛选下拉：全部 / 夜间滞留 / 拥堵 / 水边 / 逆向穿行 / 传感器 / 天气

---

## 执行顺序

```
P2.0 地图可视化     (独立，优先)
    ↓
P2.1 Visitor + 逆穿 + 天气预警  (依赖 alert-engine 改动，独立于地图)
    ↓
P2.2 IoT 设备管理   (独立)
    ↓
P2.3 农产品 + 消费  (独立)
    ↓
P2.4 树木档案完善   (依赖 P2.3 的 Product 模型——日报产品排行需 Product 数据)
    ↓
P2.5 路线水脉联动   (依赖 P2.1 的天气预警 + P2.4 的告警系统)
```

---

## 完整验证流程

```bash
# 1. 数据库
cd packages/database && npx prisma db push
# → 验收: visitor/device/device_reading/product 表存在
# → 验收: presence_log 表新增 visitorId 字段
# → 验收: harvest_booking 表新增 fruitDestination/destinationNote 字段

# 2. Type check
cd apps/web && pnpm type-check
cd apps/admin && pnpm type-check
# → 验收: 零错误

# 3. 前台回归 (:3000)
# → P0 四境/路线/预约/认养/门票/反馈 全部正常
# → P1 树木详情/活动广场/我的认养 全部正常
# → 新增: /products 商品页

# 4. 后台验收 (:3001)
# → P0 7个菜单 + P1 5个菜单 全部正常
# → 新增: /map 地图监控（17节点 + 3图层）
# → 新增: /devices 设备管理
# → 新增: /products 产品管理
# → /alerts 告警统一视图（行为+传感器+天气）
# → /analytics 增加路线排行tab
# → /trees 树木管理增加图片上传

# 5. API 验收
# → POST /api/v1/devices/readings → 201
# → GET /api/v1/devices → 设备列表
# → GET /api/v1/weather/alerts → 天气预警
# → GET /api/v1/analytics/routes/ranking → 路线热度
# → POST /api/v1/products → 201
# → POST /api/v1/upload → 201 + URL
```
