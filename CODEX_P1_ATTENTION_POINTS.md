# Codex 执行 P1 注意事项 — 按任务标注

> 配合 `CODEX_P1_INSTRUCTIONS.md` 使用。🔴=绝对不能做  ⚠️=容易出错

---

## P1.0：树木档案 + 养护日志 + 采摘预约

### Schema

| 🔴 绝对不能 | 原因 |
|------------|------|
| 修改现有模型的任何字段 | P0 数据库结构已成基线 |
| `growthPhotos` 用 `String[]` | Prisma 不支持数组类型。用 `Json @default("[]")`，读写时 `JSON.parse`/`JSON.stringify` |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `OrchardTree` 表名与 contracts 中的 `OrchardTree` 接口名混淆 | 表用 `@@map("orchard_tree")`，contracts 接口用 `OrchardTreeData`（与 P0 模式一致） |
| `OrchardTree.adoptions` 关联写错 | `TreeAdoption` 关联到 `OrchardTree`，`fields: [treeId]`，`references: [id]` |
| 忘记 `@@index([treeId, createdAt])` | `TreeCareLog` 按树+时间查询是主查询路径 |
| `CourtyardActivity.courtyardId` 没有关联表 | courtyardId 是逻辑外键（关联到 `courtyards-data.ts` 的静态数据），不加 `@relation`。如果后续院落也建表，再加关联 |
| `ActivityBooking.guestPhone` 明文存储 | 需要用 PII 脱敏（与 feedback 的 `sanitizeContent` 一致）。存入前脱敏，查询时不返回完整号码 |
| `Alert` 缺少去重逻辑 | 同一 `alertType` + 同一 `nodeId` + 同一天已有 `active` 记录时，不重复插入 |

### Seed

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `seed-trees.ts` 数据来源 | 从 `apps/web/src/lib/trees-data.ts` 的 `orchardTreeOptions` 提取：`lz018`(桂圆王)/`lz026`(荔枝古树)/`lz041`(青年荔枝树)。字段名映射：`treeCode`=id, `species`=species key, `age`=age, `blurredLocation`=location key |
| 叙事字段初始值 | `fireMemory`/`newShootsRecord` 留 `null`，等 admin 编辑填入。`growthPhotos` 初始化为 `[]` |
| 别忘了在 `seed.ts` 中调用 | `import { seedTrees } from "./seed-trees"` → `await seedTrees()` |

### API

| 🔴 绝对不能 | 原因 |
|------------|------|
| 删除 `POST /api/v1/tree-adoptions` 的现有校验逻辑 | 只把 `return NextResponse.json({ data: { id: ..., status: ... } })` 改为 `prisma.treeAdoption.create()`。请求校验（treeId 存在、plan 有效）保留并增强（查 DB 而非静态数组） |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `GET /api/v1/trees` 替换了静态数据 | 如果 DB 为空（seed 没跑），API 返回空数组 → 前台 `/trees` 页面空列表。建议 API 做 fallback：DB 无数据时返回静态数据 |
| `GET /api/v1/trees/[code]` 的 `code` 参数 | Next.js App Router 的 `params` 是异步的：`{ params: Promise<{ code: string }> }`。需要 `await params` |
| `POST /api/v1/trees/[code]/care-logs` 鉴权 | 养护日志只能 admin 录入。加 API key 校验或简单的 `X-Admin-Token` header |
| `POST /api/v1/harvest-bookings` 时间冲突 | 同一棵树同一时段不重复预约。查已有 booking 的 `scheduledDate` 是否有冲突 |
| CORS 模式 | 所有新 route.ts 复用 `aigc-api.ts` 的 `jsonResponse`/`optionsResponse` |

### 前台

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `trees/[code]/page.tsx` 是动态路由 | 需要 `generateStaticParams` 或直接用动态渲染 |
| 养护日志时间线 | 按 `createdAt` 降序排列，最新的在最上面 |
| `me/page.tsx` 的"我的认养" | 通过 adopterPhone 查询（当前无登录系统，用手机号作为关联键）。注意 PII：不要把完整手机号显示在 UI 上 |

### Admin

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 新增菜单项位置 | 在 `admin-copy.ts` 的 `menu` 数组中插入，`admin-sidebar.tsx` 同步更新 `menuIcons` 和 `menuHrefs`。新增图标：`Trees`(树木管理) 回归、`Sprout`(采摘管理) |
| 树木编辑表单 | 叙事字段（fireMemory/newShootsRecord）用 `<textarea>`，growthPhotos 用简单的 URL 列表编辑（不上传组件——P1 不建图片上传系统） |

---

## P1.1：水脉可操作系统

### API

| 🔴 绝对不能 | 原因 |
|------------|------|
| `POST /api/v1/infrastructure/sensors` 无鉴权 | 任何人可写入传感器数据 → 数据污染。必须加 `X-API-Key` header 校验，key 从 `SENSOR_API_KEY` 环境变量读取 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `POST /api/v1/infrastructure/sensors` 批量上报 | IoT 网关可能一次上报多条传感器数据。API 接受数组：`{ readings: [{ sensorId, type, value, unit, nodeId? }] }`，用 `prisma.sensorReading.createMany()` |
| `POST /api/v1/infrastructure/decide` 超时 | DeepSeek 调用可能 10-30 秒。前端调用需要设 timeout 或 loading 状态 |
| 决策引擎 AI 不可用时的表现 | `try { aiResult } catch { return ruleBasedResult }`。不抛错，不返回 503。规则层输出仍包含 `triggeredBy: "rule_engine"` 标记 |
| 规则层阈值硬编码 | 阈值（30%/35°C/20%）写为常量，注释说明来源。方便后续配置化 |
| `ControlCommand` 状态流 | `pending`(AI生成) → `approved`(人工确认) → `executed`(硬件执行) 或 `rejected`(人工驳回)。API: `PATCH /api/v1/infrastructure/commands` 变更状态 |

### Admin

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| Infrastructure 页面数据源切换 | 当前是纯占位。改为：先调 `GET /api/v1/infrastructure/sensors/latest`，有数据→显示，无数据→保留"硬件待接入"占位。不要直接删掉占位逻辑 |
| "执行决策"按钮 | 调 `POST /api/v1/infrastructure/decide`，显示结果列表。每条建议有"批准"/"驳回"按钮。调 `PATCH /api/v1/infrastructure/commands` |

### 日报增强

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `generateDailyReport` 新增 infrastructure section | sections 数组追加 `{ type: "infrastructure", ... }`。如果决策引擎返回空（无 sensor 数据），该 section 的 content 写"暂无传感器数据，设施调度建议待生成" |
| actionItems 去重 | 日报已有 actionItems（来自 AI 分析），新增水利 actionItems 可能重复。合并时按 `action` 文本去重 |

---

## P1.2：感知增强 + 告警引擎

### Alert 生成

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 夜间判断硬编码 18:00 | 不同的季节日落时间不同。P1 用简化逻辑：`timestamp.getHours() >= 18 || timestamp.getHours() < 6`。后续可配置 |
| 去重逻辑 | `prisma.alert.findFirst({ where: { alertType, nodeId, createdAt: { gte: todayStart }, status: "active" } })`→ 已存在则跳过 |
| 拥堵阈值 | `peopleCount / capacity > 0.8`。capacity 从 `SpaceNode` 读取。如果 capacity 为 0（未设置），跳过拥堵检测 |
| 逆向穿行检测的性能 | 需要遍历所有路线+所有 presenceLog 配对。P1 简化：只在 `computeNodeDailyScores` 后批量跑一次，不在每次 presence POST 时跑 |

### API

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `PATCH /api/v1/alerts` 状态变更 | 只允许 `active→acknowledged→resolved`，不允许 `resolved→active` |
| `GET /api/v1/analytics/cross/flow-vs-spend` | 交叉分析依赖 PresenceLog 和 UnifiedOrder。如果某节点有客流无消费，`conversionRate`=0, `roi`=0，不是 null |
| 交叉分析的分母为 0 | `peopleCount === 0` 时 `conversionRate` 和 `roi` 设为 `null` 并标记 `"no_visitor_data"` |

### Admin

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `/alerts` 页面的 alertType 筛选 | 用中文标签映射（alertType → 中文），在 `admin-copy.ts` 中新增 `alerts.types` |
| `/analytics` 页面的排序 | 默认按 `conversionRate` 降序。支持按 `revenue`/`peopleCount` 排序 |
| 交叉分析表空状态 | 当天无 presence+消费数据 → 显示"暂无当日数据" |

---

## P1.3：院落运营

### 数据模型

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `CourtyardActivity.courtyardId` 不建 DB 关联 | 院落数据目前是静态 mock（`courtyards-data.ts` 中的 3 个院落）。活动通过 `courtyardId` 字符串匹配，不建外键。后续院落建表后再加关联 |
| `ActivityBooking` 的 capacity 校验 | 创建 booking 时：查 `activity.maxCapacity`，查已有 `confirmed` booking 的 `SUM(guestCount)`，确保 `SUM + new.guestCount <= maxCapacity`。用 `prisma.$transaction` 防超卖 |

### API

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `POST /api/v1/activity-bookings` 的事务 | ```ts
const result = await prisma.$transaction(async (tx) => {
  const activity = await tx.courtyardActivity.findUnique({ where: { id } })
  const booked = await tx.activityBooking.aggregate({ where: { activityId: id, status: "confirmed" }, _sum: { guestCount: true } })
  if ((booked._sum.guestCount ?? 0) + guestCount > activity.maxCapacity) throw new Error("FULL")
  return tx.activityBooking.create({ data })
})
``` |
| `PATCH /api/v1/activities` 权限 | 活动管理只能 admin 操作。加简单的 header 鉴权 |

### 前台

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `/activities` 页面筛选 | 按 `activityType` 和 `scheduledDate` 筛选。日期默认今天 |
| 预订按钮状态 | `status === "full"` 或 `status === "cancelled"` → disabled + "已满"/"已取消" |
| booking 页面新增活动模块 | 只展示该院落对应的活动（`courtyardId` 匹配）。不展示其他院落的活动 |

---

## P1.4：天气接入评分

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 每个节点重复调天气 API | `computeNodeDailyScores` 遍历 17 个节点，只调一次 `getWeatherCondition(date)` 存为变量，所有节点复用 |
| QWeather 返回的天气文本映射 | 中文天气文本多种多样（"多云转晴"/"小雨"/"中雨"/"雷阵雨"）。用 `/雨|rain|雷/i` 匹配 rainy，用温度 > 32°C 判断 hot，其余默认 sunny |
| API key 未配置时 | 不报错，返回 `"sunny"`（当前 P0 默认行为） |
| `getWeatherCondition` 缓存 | 同一天只调一次 QWeather，结果缓存到变量（模块级 Map: `{ [date]: condition }`） |

---

## P1.5：降级方案

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| "意向下单"的 `pending_offline` 状态 | 不要修改 `UnifiedOrder` 模型。直接在 POST 时允许 `status: "pending_offline"`（字段本身是 String，无枚举约束） |
| 手动录入传感器数据 | Infrastructure 页面加"录入读数"按钮→弹出表单→`POST /api/v1/infrastructure/sensors`（带 `X-API-Key`）。录入时 `source` 标记为 `"manual"` |
| 排名表格替代热力图 | `/analytics` 页面用表格（按 revenue/peopleCount 排序），表头可点排序。不做地图集成 |

---

## 跨任务通用注意事项

| # | 规则 |
|---|------|
| 1 | 🔴 **不动 P0 的任何模型和 API** — 只追加新模型、新 API |
| 2 | 🔴 **唯一需要修改的现有文件**：`POST /api/v1/tree-adoptions/route.ts` — 把 mock 改为 Prisma create，保留校验逻辑 |
| 3 | 🔴 **不动 feedback-admin.tsx** — 它的业务逻辑已是最终版 |
| 4 | ⚠️ 所有新增 API 复用 `aigc-api.ts` 的 CORS 模式 |
| 5 | ⚠️ 日期统一 `YYYY-MM-DD`，时区 `+08:00` |
| 6 | ⚠️ Prisma `Json` 字段：写入时传 JS 对象/数组，Prisma 自动序列化；读取时自动反序列化。不需要手动 `JSON.parse`/`JSON.stringify` |
| 7 | ⚠️ `ActivityBooking.guestPhone` 和 `TreeAdoption.adopterPhone` 需要 PII 脱敏 |
| 8 | ⚠️ 所有 AI 调用（DeepSeek）加 `try-catch`，失败时回退到规则层或返回明确错误，不白屏 |
| 9 | ⚠️ `packages/utils` 保持无 DB 依赖 — `control-engine` 的纯规则层放 utils，需要 DB 的部分放 web/lib |
