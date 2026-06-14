# Codex 执行 P2 注意事项 — 按任务标注

> 配合 `CODEX_P2_INSTRUCTIONS.md` 使用。🔴=绝对不能做  ⚠️=容易出错

---

## P2.0：地图可视化

| 🔴 绝对不能 | 原因 |
|------------|------|
| 引入需要 API key 的地图服务（Google Maps/Mapbox/高德） | 增加外部依赖和费用。用 Leaflet + OpenStreetMap 瓦片，完全免费无 key |
| 在 server component 中渲染地图 | Leaflet 需要 `window` 对象，必须在 client component 中 `"use client"` |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| Leaflet CSS 未引入 | 在 `globals.css` 中 `@import "leaflet/dist/leaflet.css"` 或在 layout.tsx 中 import |
| 地图容器高度为 0 | `MapContainer` 父容器必须有明确高度：`style={{ height: "calc(100vh - 120px)" }}` |
| react-leaflet 版本兼容 | 使用 react-leaflet v4+，API 与 v3 不同：`MapContainer` 替代旧版 `Map`，`useMap()` 在子组件中获取 map 实例 |
| 默认图标路径问题 | Leaflet 默认 marker icon PNG 路径在 webpack 打包后会 404。在 `MapContainer` 创建前修复：`import L from "leaflet"; delete (L.Icon.Default.prototype as any)._getIconUrl; L.Icon.Default.mergeOptions({ iconRetinaUrl: "...", iconUrl: "...", shadowUrl: "..." })` |
| 无坐标节点不跳过 | `node.lat == null || node.lng == null` 时跳过标注，不报错不白屏 |
| 图层切换全量重渲染 | 用 `useState` 管理 `activeLayer`，切换时只改 marker 的 `opacity`/`radius`，不销毁重建 MapContainer |

---

## P2.1：Visitor 模型 + 逆向穿行 + 天气预警

### Visitor

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `fingerprint` 唯一性 | 用 `navigator.userAgent + screen.width + screen.height + timezone` 生成简单指纹（非追踪，仅用于区分游客路径） |
| `PresenceLog.visitorId` 可选字段 | 现有 presence 数据 visitorId 为 null，不影响存量数据。检测时跳过 `visitorId === null` 的记录 |
| Visitor 去重 | 同一 fingerprint 复用已有 Visitor：`prisma.visitor.upsert({ where: { fingerprint }, create/update })` |

### 逆向穿行

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 没有 visitorId 时不检测 | `if (!log.visitorId) continue` — 保持向后兼容 |
| waypointOrder 映射 | SpaceNode.nameKey 与 route waypoints 使用相同的 i18n key。用 `waypointOrder.get(node.nameKey)` 获取顺序号 |
| 误报 | `order[i] - order[i+1] > 3` 阈值可调。差值 <= 3 的逆序可能是正常折返，不告警 |
| 性能 | visitor 按 `visitorId` 分组后在内存中排序+检测，不额外查 DB |

### 天气预警

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| QWeather 预警 API 不可用时 | `fetchWeatherAlerts()` 返回空数组 `[]`，不抛错，不影响告警引擎其他检测 |
| QWeather 预警类型编码 | 类型编码对照表：`11B01`=暴雨、`11B02`=暴雪、`11B03`=高温、`11B04`=大风、`11B06`=台风。只映射已知编码，未知编码归入 `"other"` |
| 同一预警重复生成 | `createAlertIfAbsent` 用 `alertType + dayStart` 去重。同一天同类型天气预警只生成一次 |
| API 响应中 `warning` 字段为 null | QWeather 无预警时 `warning` 字段为 null 而非空数组。用 `payload.warning ?? []` |
| `QWEATHER_LOCATION_ID` 未配置 | 默认 `"101040100"`（重庆合川），不是走马村的精确位置 ID。建议在 .env.example 中标注 |

---

## P2.2：IoT 设备管理

| 🔴 绝对不能 | 原因 |
|------------|------|
| `Device.lastSeenAt` 手动设置 | 应该由设备心跳自动更新（每次 `POST /api/v1/devices/readings` 时连带更新 `lastSeenAt`）。如果手动设置，离线检测不准确 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 设备上报 API 无鉴权 | `POST /api/v1/devices/readings` 加 `X-API-Key` 校验（复用 `isSensorRequestAuthorized` 或建 `isDeviceRequestAuthorized`） |
| 心跳更新 | 每次设备上报读数时，连带 `prisma.device.update({ where: { id }, data: { lastSeenAt: new Date() } })` |
| 离线检测阈值 | 30 分钟无心跳 = offline。用 `new Date(Date.now() - 30 * 60 * 1000)` |
| 设备读数折线图不引入图表库 | 用纯 CSS 实现简单柱状图：`<div style={{ height: value/maxValue * 100 + "%" }}>` 或文字趋势描述 |
| 设备类型枚举 | `Device.type` 用 String（不建 Prisma enum）：`"soil_sensor" | "water_sensor" | "weather_station" | "valve" | "camera"` |
| `Device.nodeId` 可选 | 不强制关联 SpaceNode——移动设备可能不属于任何固定节点 |

---

## P2.3：农产品模型 + 消费闭环

| 🔴 绝对不能 | 原因 |
|------------|------|
| 接入真实支付 API | 当前无微信支付/支付宝商户号。任何调支付接口的代码都会在验收时失败 |
| 修改 `UnifiedOrder.orderType` 的现有枚举 | 只追加 `"product_order"` 到 `orderTypes` 数组，不删不改现有值 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 意向下单的流程 | 前台：选商品 → 填姓名/手机 → 点击"意向购买" → `POST /api/v1/orders`（`orderType: "product_order"`, `status: "pending_offline"`） → 弹窗"订单已提交，请到 XX 点位核销" |
| `Product.nodeId` 关联 | 关联到消费点位（如 ridge-courtyard 的农产品展销点），用于消费热力图 |
| `Product.price` 可选 | `null` 表示"面议/时价"，前台展示"面议"而非 `¥0` |
| 产品分类 | `Product.category` 用 String：`"lychee" | "longan" | "drink" | "gift" | "workshop"` |
| 日报产品排行 | 按 `productName` 聚合（非 `productId`）——因为 `UnifiedOrder` 已有 `productName` 字段，不强制关联 Product 表 |

---

## P2.4：树木档案完善

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 文件上传路径 | 上传到 `/public/uploads/trees/`。确保目录存在（没有则 `mkdir`） |
| 文件命名冲突 | 用 `Date.now()-原始文件名` 防重名 |
| 文件大小限制 | 限制 5MB/张。API 校验 `content-length` header |
| 文件类型限制 | 只允许 `image/jpeg`, `image/png`, `image/webp` |
| 上传 API 鉴权 | `POST /api/v1/upload` 必须加 `X-Admin-Token`，否则任何人都可上传文件 |
| 前台图片懒加载 | 树详情页照片网格用 `loading="lazy"` 属性 |
| `growthPhotos` 字段更新 | Admin 上传后追加到数组：`growthPhotos: [...existing, newUrl]`（不是替换） |
| `fruitDestination` 枚举建议 | `"加工" | "销售" | "赠送" | "自用"`。P2 用 String，不做严格枚举 |

---

## P2.5：路线 + 水脉 + 告警联动

### 路线热度分析

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| RouteGenerationLog 数据的 provider 字段 | `"deepseek"`（AI 正常）、`"configuration-required"`（AI 未配置/出错）。统计 AI 占比时按 provider 分组 |
| 路线名展示 | `routeId` 是 i18n key（如 `"gentle-ancient-road"`）。Admin 页面展示时用 `adminCopy` 中的映射或直接显示 routeId 本身 |

### 路线生成安全过滤

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 修改 `routes/generate/route.ts` 时 | 只追加 `riskSlugs` 计算和 prompt 调整逻辑。现有 AI 调用和 fallback 逻辑不变 |
| Prompt 调整方式 | 在高风险节点的 waypoint 条目后追加 `（⚠️当前安全风险较高，建议避开）`。不要从列表中删除（AI 需要知道完整选项） |
| 无高风险节点时 | `riskSlugs` 为空 Set → prompt 无变化 → 行为与 P1 一致 |

### 告警统一视图

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 三个告警源的 API | `GET /api/v1/alerts`（行为）、`GET /api/v1/infrastructure/alerts`（传感器）、`GET /api/v1/weather/alerts`（天气）。三个 API 响应格式不同，需要在 Admin 端统一 |
| 统一格式 | Admin 端定义统一 `UnifiedAlert` 接口：`{ id, type, source: "behavior"|"sensor"|"weather", severity, message, createdAt }`。三个 API 结果各自 map 到此接口 |
| 三个 API 用 `Promise.allSettled` | 一个挂了不影响另外两个 |

### 六站叙事路线

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| i18n keys 必须完整 | 新增 `plans.narrativeSixStops.title/summary/totalTime/mobility/weather/rainFallback/notice` 全套 key |
| waypoints 指向真实节点 | 6 个 waypoint key 必须在 `zh-CN.json` 的 `waypoints` 和 `seed-nodes.ts` 的 `nameKey` 中对应存在 |
| 不要删现有路线 | 在 `routeOptions` 数组末尾追加，不删不改现有 6 条路线 |

---

## 跨任务通用注意事项

| # | 规则 |
|---|------|
| 1 | 🔴 **不动 P0/P1 模型字段** — 只追加新模型、新字段（`PresenceLog.visitorId`、`HarvestBooking.fruitDestination` 等，都是 optional 追加） |
| 2 | 🔴 **唯一需要改的 P0 API**：`routes/generate/route.ts`（追加风险过滤逻辑） |
| 3 | 🔴 **唯一需要改的 P1 文件**：`alert-engine.ts`（追加逆向穿行+天气预警）、`report-generator.ts`（追加设备离线+产品排行） |
| 4 | ⚠️ Leaflet CSS import 位置：必须在任何 Leaflet 组件之前加载 |
| 5 | ⚠️ 所有新 API 复用 `aigc-api.ts` 的 CORS 模式 |
| 6 | ⚠️ 设备/上传 API 鉴权：`X-API-Key`（IoT 设备）、`X-Admin-Token`（Admin 操作） |
| 7 | ⚠️ 日期统一 `YYYY-MM-DD`，时区 `+08:00` |
| 8 | ⚠️ Prisma `db push` 新增 optional 字段不会破坏现有数据，但需要确认 PostgreSQL 允许 |
| 9 | ⚠️ `Product.price` 和 `DeviceReading.value` 用 `Float` — 精度足够，不需要 `Decimal` |
