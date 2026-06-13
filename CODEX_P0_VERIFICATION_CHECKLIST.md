# P0 验收检查清单

> 逐项检查，通过打 ✅，不通过打 ❌ 并记录问题。

---

## 一、准备与安全边界（Phase 0）

### 1.1 依赖与构建

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 1 | admin 依赖完整 | `cat apps/admin/package.json` 查看 dependencies | 包含 `@zouma/database`、`@zouma/utils`、`@zouma/ui` |
| 2 | web 依赖完整 | `cat apps/web/package.json` 查看 dependencies | 包含 `@zouma/prompts` |
| 3 | transpilePackages | `cat apps/admin/next.config.mjs` | 数组包含 `@zouma/contracts`、`@zouma/database`、`@zouma/utils`、`@zouma/ui` |
| 4 | CRON_SECRET | `cat .env.example` | 末尾有 `CRON_SECRET=` |
| 5 | pnpm install | `pnpm install` | 无报错 |
| 6 | web type-check | `cd apps/web && pnpm type-check` | 零错误 |
| 7 | admin type-check | `cd apps/admin && pnpm type-check` | 零错误 |

### 1.2 中文文案

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 8 | admin-copy.ts 中文正常 | IDE 打开 `apps/admin/src/lib/admin-copy.ts`，逐行检查 | 所有字符串为正常中文，无 � 或乱码 |
| 9 | feedback-admin.tsx 中文正常 | 打开文件检查时间线中的 `·` 分隔符、品牌字样 "走" | 正常显示 |
| 10 | 新增文案中文正常 | 检查 `admin-copy.ts` 中新增的 dashboard/nodes/orders/reports/infrastructure/settings/common 文案 | 全部正常中文，无乱码 |

---

## 二、数据库与类型（Phase 1）

### 2.1 Schema 完整性

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 11 | 现有模型未被修改 | `git diff packages/database/prisma/schema.prisma` | `FeedbackTicket` 和 `FeedbackHandlingRecord` 的字段、类型、attribute 与修改前一模一样 |
| 12 | SpaceNode 模型 | 查看 schema.prisma 中 SpaceNode 模型 | 包含 slug(@unique)、nameKey、realm、nodeType、capacity、terrainRisk、watersideRisk、lat?、lng?、relations 到 PresenceLog/NodeDailyScore/UnifiedOrder |
| 13 | PresenceLog 模型 | 同上 | 包含 nodeId、timestamp、peopleCount、dwellAvgMin?、source、relation 到 SpaceNode；有 `@@index([nodeId, timestamp])` |
| 14 | NodeDailyScore 模型 | 同上 | 包含 nodeId、date、totalVisitors、attractiveness、safetyRisk、weatherCondition?；有 `@@unique([nodeId, date])` |
| 15 | UnifiedOrder 模型 | 同上 | 包含 orderType、productId、productName、quantity、totalAmount、status、nodeId?、metadata?；有 `@@index([nodeId, createdAt])` |
| 16 | DailyReport 模型 | 同上 | 包含 date(@unique)、title、summary(@db.Text)、sections(Json)、metrics(Json)、actionItems(Json) |
| 17 | SensorReading 模型 | 同上 | 包含 sensorId、type、value、unit、nodeId?；有 `@@index([sensorId, createdAt])` |
| 18 | 所有新模型有 @@map | 同上 | 6 个模型都有 `@@map()` 映射到 snake_case 表名 |
| 19 | 没有使用 Prisma enum | `grep "enum " packages/database/prisma/schema.prisma` | 没有新增的 Prisma enum 关键字（realm/nodeType/orderType 等用 String） |

### 2.2 数据库操作

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 20 | db push 成功 | `cd packages/database && npx prisma db push` | 无报错 |
| 21 | 6 张新表存在 | 连接 PostgreSQL 执行 `\dt` 或 `SELECT tablename FROM pg_tables WHERE schemaname='public'` | 能看到 `space_node`、`presence_log`、`node_daily_score`、`unified_order`、`daily_report`、`sensor_reading` |
| 22 | 现有表数据未丢失 | `SELECT count(*) FROM feedback_ticket` | 之前的反馈工单数据还在 |
| 23 | Prisma Client 生成 | `cd packages/database && npx prisma generate` | 无报错 |

### 2.3 Contracts 类型

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 24 | 现有类型未修改 | `git diff packages/contracts/src/index.ts` | `Scene`、`RoutePlan`、`Courtyard`、`OrchardTree`、`Feedback`、`FeedbackRecord`、`FeedbackHandlingRecord` 定义不变 |
| 25 | 新类型存在 | 打开文件查看末尾 | 有 `SpaceNodeData`、`PresenceLogData`、`NodeDailyScoreData`、`UnifiedOrderData`、`DailyReportData`、`ReportSectionData`、`ReportMetricsData`、`ActionItemData`、`SpaceNodeType`、`PresenceSource`、`OrderType` |
| 26 | 类型可 import | 在任意 `@zouma/web` 或 `@zouma/admin` 文件中 `import { SpaceNodeData } from "@zouma/contracts"` | 无 TS 报错 |

---

## 三、Seed 数据（Phase 2）

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 27 | seed-nodes.ts 存在 | `ls packages/database/prisma/seed-nodes.ts` | 文件存在 |
| 28 | 用 upsert 不是 create | `grep "upsert" packages/database/prisma/seed-nodes.ts` | 有 `prisma.spaceNode.upsert` |
| 29 | seed.ts 调用了 seedNodes | `grep "seedNodes" packages/database/prisma/seed.ts` | `main()` 中有 `await seedNodes()` |
| 30 | 反馈 seed 仍在 | `grep "feedbackTicket" packages/database/prisma/seed.ts` | 原有的 `prisma.feedbackTicket.create` 逻辑保留 |
| 31 | seed 执行成功 | `cd packages/database && npx prisma db seed` | 无报错 |
| 32 | 17 个节点入库 | `SELECT count(*) FROM space_node` | 返回 17 |
| 33 | 节点 realm 格式正确 | `SELECT DISTINCT realm FROM space_node` | 4 个值：`ancient_road`、`lychee_field`、`resilience_valley`、`ridge_dwelling`（下划线格式） |
| 34 | 重复执行不报错 | 再次跑 `npx prisma db seed` | 无报错，无 `Unique constraint failed` 错误 |

---

## 四、评分引擎（Phase 3 部分）

### 4.1 纯计算模块

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 35 | scoring-engine 在 utils | `ls packages/utils/src/scoring-engine.ts` | 文件存在 |
| 36 | utils 无 DB 依赖 | `grep "prisma\|@zouma/database" packages/utils/src/scoring-engine.ts` | 无匹配 |
| 37 | 有 server-only | `head -1 packages/utils/src/scoring-engine.ts` | 第一行 `import "server-only"` |
| 38 | 导出 computeScores | `grep "export function computeScores" packages/utils/src/scoring-engine.ts` | 存在 |
| 39 | utils index 新增导出 | `grep "scoring-engine" packages/utils/src/index.ts` | 有 `export { computeScores }` 和 type 导出 |

### 4.2 DB 聚合模块

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 40 | node-scoring 在 web/lib | `ls apps/web/src/lib/node-scoring.ts` | 文件存在 |
| 41 | 引用 prisma | `grep "@zouma/database" apps/web/src/lib/node-scoring.ts` | 有 import |
| 42 | 引用 scoring-engine | `grep "@zouma/utils" apps/web/src/lib/node-scoring.ts` | 有 import |
| 43 | 有 server-only | `head -1 apps/web/src/lib/node-scoring.ts` | 第一行 `import "server-only"` |
| 44 | 导出 computeNodeDailyScores | `grep "export async function computeNodeDailyScores" apps/web/src/lib/node-scoring.ts` | 存在 |
| 45 | 用 upsert | `grep "upsert" apps/web/src/lib/node-scoring.ts` | 有 `prisma.nodeDailyScore.upsert` |
| 46 | 用 nodeId_date 复合键 | 同上位置附近 | where 使用 `{ nodeId_date: { nodeId, date } }` |
| 47 | 空日志跳过 | 查看 for 循环内 | `if (logs.length === 0) continue` |

---

## 五、API 路由（Phase 3 + Phase 4）

### 5.1 通用检查（所有新 route.ts 都要过）

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 48 | 文件在正确位置 | `ls apps/web/src/app/api/v1/nodes/route.ts` 等 | 所有新 API 在 `apps/web/src/app/api/v1/` 下，不在 admin 下 |
| 49 | 导出 OPTIONS | `grep "export.*OPTIONS" apps/web/src/app/api/v1/nodes/route.ts` | 每个 route.ts 都有 OPTIONS 函数 |
| 50 | 有 CORS 头 | `grep "Access-Control-Allow-Origin" apps/web/src/app/api/v1/nodes/route.ts` | 每个 route.ts 都设置了 CORS 响应头 |
| 51 | import prisma | `grep "@zouma/database"` 各文件 | 需要 DB 操作的 route 有 import prisma |
| 52 | 日期用 +08:00 | `grep "+08:00\|T00:00:00" apps/web/src/app/api/v1/orders/route.ts` 等 | 日期筛选用 `+08:00` 指定时区 |

### 5.2 各端点逐项检查

| # | 端点 | 检查方法 | 通过标准 |
|---|------|---------|---------|
| 53 | GET /api/v1/nodes | `curl -s http://localhost:3000/api/v1/nodes \| head -c 200` | 返回 17 个 SpaceNode 的 JSON 数组 |
| 54 | POST /api/v1/orders (正常) | `curl -s -w "%{http_code}" -X POST http://localhost:3000/api/v1/orders -H "Content-Type: application/json" -d '{"orderType":"courtyard_booking","productId":"test","productName":"测试","quantity":1,"totalAmount":100}'` | 返回 201 + data |
| 55 | POST /api/v1/orders (缺字段) | 同上但去掉 productName | 返回 400 |
| 56 | POST /api/v1/orders (无效 orderType) | 同上但 orderType 改为 "invalid" | 返回 400 |
| 57 | POST /api/v1/orders (含 nodeId) | 同上但加上 `"nodeId":"<真实ID>"` | 返回 201，DB 中 nodeId 正确关联 |
| 58 | POST /api/v1/orders (无效 nodeId) | 同上但 nodeId 设为 "nonexistent" | 返回 400 |
| 59 | GET /api/v1/orders | `curl -s http://localhost:3000/api/v1/orders` | 返回 `{ data: [...], meta: { total, page, pageSize } }` |
| 60 | GET /api/v1/orders?nodeId=X | `curl -s "http://localhost:3000/api/v1/orders?nodeId=<真实ID>"` | 只返回该节点的订单 |
| 61 | GET /api/v1/orders?date=Y | `curl -s "http://localhost:3000/api/v1/orders?date=2026-06-13"` | 只返回当天的订单 |
| 62 | GET /api/v1/orders?orderType=X | `curl -s "http://localhost:3000/api/v1/orders?orderType=courtyard_booking"` | 只返回该类型的订单 |
| 63 | GET /api/v1/analytics/consumption/by-node | `curl -s http://localhost:3000/api/v1/analytics/consumption/by-node` | 返回 `[{ nodeId, nodeName, revenue, orderCount }]` |
| 64 | POST /api/v1/presence (正常) | `curl -s -w "%{http_code}" -X POST http://localhost:3000/api/v1/presence -H "Content-Type: application/json" -d '{"nodeId":"<真实ID>","peopleCount":30,"dwellAvgMin":15}'` | 返回 201 |
| 65 | POST /api/v1/presence (无效 nodeId) | 同上但 nodeId 不存在 | 返回 400 |
| 66 | GET /api/v1/presence?latest=true | `curl -s "http://localhost:3000/api/v1/presence?latest=true"` | 返回各节点最新一条 presence 数据 |
| 67 | GET /api/v1/presence/series | `curl -s "http://localhost:3000/api/v1/presence/series?nodeId=<真实ID>"` | 返回该节点的 presence 时间序列 |
| 68 | GET /api/v1/nodes/scores?date=today | `curl -s "http://localhost:3000/api/v1/nodes/scores?date=2026-06-13"` | 返回有 presence 数据的节点评分 |
| 69 | GET /api/v1/nodes/scores/[slug] | `curl -s http://localhost:3000/api/v1/nodes/scores/visitor-center` | 返回该节点评分 + 节点信息 |
| 70 | 不存在的 slug | `curl -s -w "%{http_code}" http://localhost:3000/api/v1/nodes/scores/nonexistent` | 返回 404 |

### 5.3 AI 日报

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 71 | @zouma/prompts 包存在 | `ls packages/prompts/daily-report.ts` | 文件存在 |
| 72 | prompt 导出 | `grep "export const DAILY_REPORT_SYSTEM_PROMPT" packages/prompts/daily-report.ts` | 存在，是模板字符串 |
| 73 | prompts package.json | `ls packages/prompts/package.json` | name 为 `@zouma/prompts` |
| 74 | web 有 prompts 依赖 | `grep "@zouma/prompts" apps/web/package.json` | 有 `"@zouma/prompts": "workspace:*"` |
| 75 | report-generator.ts 存在 | `ls apps/web/src/lib/report-generator.ts` | 文件存在 |
| 76 | report-generator 导出 generateDailyReport | `grep "export async function generateDailyReport" apps/web/src/lib/report-generator.ts` | 存在 |
| 77 | POST /api/v1/reports/generate | `curl -s -w "%{http_code}" -X POST http://localhost:3000/api/v1/reports/generate -H "Content-Type: application/json" -d '{}'` | 返回 200 + `{ data: { title, summary, sections, metrics, actionItems } }` |
| 78 | 日报 JSON 解析有三层保护 | `grep "JSON.parse\|replace.*```json\|slice.*{\|lastIndexOf" apps/web/src/lib/report-generator.ts` | 至少有两种解析策略 |
| 79 | actionItems >= 3 | 查看上一步返回的日报 | `actionItems` 数组长度 >= 3 |
| 80 | sections 完整 | 查看上一步返回的日报 | sections 包含 visitor_flow / consumption / alerts / feedback / weather |
| 81 | GET /api/v1/reports | `curl -s http://localhost:3000/api/v1/reports` | 返回日报数组 |
| 82 | GET /api/v1/reports/latest | `curl -s http://localhost:3000/api/v1/reports/latest` | 返回最新一条日报 |
| 83 | GET /api/v1/cron/daily-report (无 secret) | `curl -s -w "%{http_code}" http://localhost:3000/api/v1/cron/daily-report` | 返回 401 |
| 84 | GET /api/v1/cron/daily-report (错误 secret) | `curl -s -w "%{http_code}" "http://localhost:3000/api/v1/cron/daily-report?secret=wrong"` | 返回 401 |
| 85 | GET /api/v1/cron/daily-report (正确 secret) | 先设置 `CRON_SECRET=test123` 到 .env，重启 web，再 `curl -s "http://localhost:3000/api/v1/cron/daily-report?secret=test123"` | 返回 200 + `{ generated: true, date }` |

---

## 六、Admin Shell 与反馈保留（Phase 5）

### 6.1 Shell 结构

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 86 | admin-sidebar.tsx 存在 | `ls apps/admin/src/components/admin-sidebar.tsx` | 文件存在 |
| 87 | admin-shell.tsx 存在 | `ls apps/admin/src/app/admin-shell.tsx` | 文件存在 |
| 88 | layout.tsx 使用 AdminShell | `grep "AdminShell" apps/admin/src/app/layout.tsx` | 有 `<AdminShell>{children}</AdminShell>` |
| 89 | layout.tsx 是 server component | `head -5 apps/admin/src/app/layout.tsx` | 没有 `"use client"` |
| 90 | admin-shell.tsx 是 client component | `head -1 apps/admin/src/app/admin-shell.tsx` | `"use client"` |
| 91 | sidebar 有 key 触发刷新 | `grep "key={refreshKey}" apps/admin/src/app/admin-shell.tsx` | `<section>` 上有 `key={refreshKey}` |
| 92 | page.tsx 重定向 | `cat apps/admin/src/app/page.tsx` | `redirect("/dashboard")` |

### 6.2 菜单

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 93 | 7 个菜单项 | `grep "menu:" apps/admin/src/lib/admin-copy.ts -A 10` | dashboard / feedback / nodes / orders / reports / infrastructure / settings |
| 94 | 菜单用 Link 不是 button | `grep "Link" apps/admin/src/components/admin-sidebar.tsx` | 菜单项用 `<Link href={...}>` |
| 95 | Dashboard 高亮逻辑 | `grep "dashboard" apps/admin/src/components/admin-sidebar.tsx -B 2 -A 2` | `item.key === "dashboard"` 用 `pathname === "/"` 判断 |
| 96 | 其他高亮用 startsWith | `grep "startsWith" apps/admin/src/components/admin-sidebar.tsx` | 其他菜单用 `pathname.startsWith(href)` |
| 97 | lucide 图标齐全 | `grep "import.*lucide-react" apps/admin/src/components/admin-sidebar.tsx` | 包含 LayoutDashboard, ClipboardList, MapPin, ShoppingCart, FileText, Cpu, Settings |

### 6.3 反馈功能保留（最关键的检查）

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 98 | FeedbackContent 存在 | `grep "export function FeedbackContent" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 99 | loadRecords 保留 | `grep "async function loadRecords" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 100 | updateStatus 保留 | `grep "async function updateStatus" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 101 | stats useMemo 保留 | `grep "const stats = useMemo" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 102 | 表格 JSX 保留 | `grep "grid-cols-\[1.1fr_0.65fr" apps/admin/src/app/feedback-admin.tsx` | 存在（表头列结构） |
| 103 | 详情面板保留 | `grep "selectedRecord \?" apps/admin/src/app/feedback-admin.tsx` | 存在（详情面板渲染逻辑） |
| 104 | statusOrder 保留 | `grep "statusOrder" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 105 | handlingRecords 时间线保留 | `grep "handlingRecords" apps/admin/src/app/feedback-admin.tsx` | 存在（处理记录渲染） |
| 106 | textarea 备注保留 | `grep "textarea\|noteLabel\|notePlaceholder" apps/admin/src/app/feedback-admin.tsx` | 存在 |
| 107 | <main>/<aside> 外层已删除 | `grep "<main\|<aside" apps/admin/src/app/feedback-admin.tsx` | 没有 `<main className="min-h-screen...">` 或 `<aside className="border-b...">` sidebar |
| 108 | feedback/page.tsx 导入正确 | `cat apps/admin/src/app/feedback/page.tsx` | import `FeedbackContent` 而非 `FeedbackAdmin` |
| 109 | /feedback 页面可访问 | 浏览器打开 `http://localhost:3001/feedback` | 左侧有 sidebar，右侧有反馈列表和详情面板 |
| 110 | 工单列表正常加载 | 同上，查看列表中是否有 seed 的 2 条工单 | 显示 "FB-20260612-001" 和 "FB-20260612-002" |
| 111 | 状态变更可用 | 选中一条工单，输入备注，点"处理中"按钮 | 状态文字变色，时间线新增一条记录 |
| 112 | 刷新按钮可用 | 点 sidebar 底部"刷新"按钮 | 工单列表重新加载 |

### 6.4 导航

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 113 | / 重定向到 /dashboard | 浏览器打开 `http://localhost:3001/` | URL 变为 `/dashboard`，显示云脑总览 |
| 114 | 7 个菜单均可点击 | 依次点击 7 个菜单 | 每次 URL 变化，页面切换，不白屏 |
| 115 | 刷新后停留 | 在 /nodes 页面按 F5 | 仍在 /nodes，sidebar 高亮正确 |
| 116 | 高亮跟随 | 在不同页面之间切换 | 当前页面对应的菜单项有白色高亮样式 |

---

## 七、Admin 新页面与共享组件（Phase 6）

### 7.1 共享组件

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 117 | AdminStatCard 存在 | `ls apps/admin/src/components/admin-stat-card.tsx` | 文件存在 |
| 118 | AdminDataTable 存在 | `ls apps/admin/src/components/admin-data-table.tsx` | 文件存在 |
| 119 | AdminDataTable 支持泛型 | `grep "TableColumn<T>\|AdminDataTable<T" apps/admin/src/components/admin-data-table.tsx` | 有泛型定义 |
| 120 | AdminDataTable 有空状态 | `grep "emptyLabel\|rows.length === 0\|noData" apps/admin/src/components/admin-data-table.tsx` | 空数据时显示提示文字 |

### 7.2 Dashboard

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 121 | 文件存在 | `ls apps/admin/src/app/dashboard/page.tsx` | 存在 |
| 122 | 4 个指标卡片 | 浏览器打开 `/dashboard`，查看顶部区域 | 有 4 个卡片：今日客流、今日订单、今日收入、平均满意度 |
| 123 | 最新日报区域 | 同上，向下滚动 | 有"最新日报"卡片（含生成按钮） |
| 124 | 节点 TOP5 区域 | 同上 | 有 TOP5 列表 |
| 125 | 活跃告警区域 | 同上 | 有告警区域（可能为空） |
| 126 | 无数据时不白屏 | 首次加载（无 presence 数据时）| 显示空状态提示文字，不是空白 |
| 127 | 生成日报按钮可用 | 点"生成日报"按钮 | 按钮 disabled + loading 文案 + 旋转动画，等 10-30 秒后显示日报 |
| 128 | 用 Promise.allSettled | `grep "allSettled" apps/admin/src/app/dashboard/page.tsx` | 存在（多个 fetch 用 allSettled） |

### 7.3 Nodes

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 129 | 文件存在 | `ls apps/admin/src/app/nodes/page.tsx` | 存在 |
| 130 | 节点表格 | 浏览器打开 `/nodes` | 显示 17 个节点表格，列：slug、nameKey、realm、nodeType、capacity、terrainRisk、watersideRisk |
| 131 | 节点名可读 | 同上，检查节点名列 | 显示中文名或可读文本，不是纯 key 字符串 |
| 132 | 点击节点查看详情 | 点击一行 | 右侧或下方显示评分详情 |
| 133 | 无评分时不报错 | 对没有 presence 的节点查看详情 | 显示 "暂无评分数据" 而非白屏 |

### 7.4 Orders

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 134 | 文件存在 | `ls apps/admin/src/app/orders/page.tsx` | 存在 |
| 135 | 筛选栏 | 浏览器打开 `/orders` | 有 orderType 下拉、nodeId 下拉、日期选择器 |
| 136 | 统计卡片 | 同上 | 显示总收入、总订单、客单价 |
| 137 | 订单表格 | 同上 | 显示之前 curl 创建的测试订单 |
| 138 | 筛选生效 | 切换 orderType 下拉 | 表格数据变化 |
| 139 | 类型中文显示 | 查看订单表格的"类型"列 | 显示"院落预约"/"树木认养"/"票务活动"而非英文 key |
| 140 | 点位消费汇总 | 向下滚动 | 有"按点位消费汇总"卡片 |
| 141 | 无订单时不白屏 | 清空订单后访问（或首次加载）| 显示"暂无订单数据" |

### 7.5 Reports

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 142 | 文件存在 | `ls apps/admin/src/app/reports/page.tsx` | 存在 |
| 143 | 日期选择 + 生成按钮 | 浏览器打开 `/reports` | 有日期选择器和"生成日报"按钮 |
| 144 | 日报列表 | 同上（如果有历史日报） | 左侧显示日期列表 |
| 145 | 日报详情 | 点击一条日报 | 右侧显示 title、summary、sections、actionItems |
| 146 | actionItems 优先级颜色 | 查看 actionItems 区域 | high=红色、medium=蓝色、low=灰色 |
| 147 | 生成按钮 loading | 点"生成日报" | 按钮 disabled + "AI 正在生成..." + 旋转动画 |
| 148 | AI 解析失败不白屏 | 暂难测试，检查代码 | `grep "catch\|try\|error" apps/admin/src/app/reports/page.tsx` 有错误处理 |

### 7.6 Infrastructure

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 149 | 文件存在 | `ls apps/admin/src/app/infrastructure/page.tsx` | 存在 |
| 150 | 传感器卡片 | 浏览器打开 `/infrastructure` | 5 张传感器卡片显示"硬件待接入"（非 "0" 或空白） |
| 151 | 控制指令区域 | 同上 | 显示"暂无控制指令" |
| 152 | 环境状态 | 同上 | 显示 QWEATHER_API_KEY 等配置状态 |

### 7.7 Settings

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 153 | 文件存在 | `ls apps/admin/src/app/settings/page.tsx` | 存在 |
| 154 | API Base 显示 | 浏览器打开 `/settings` | 显示 `http://localhost:3000/api/v1` |
| 155 | 不泄露密钥 | 查看页面源码和 UI | 没有显示任何 API key 的实际值，只有"已配置"/"未配置" |
| 156 | 数据库状态 | 同上 | 显示"已连接" |

---

## 八、前台回归

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 157 | 首页 | `http://localhost:3000/zh-CN` | Hero、天气、四境卡片、快速入口正常 |
| 158 | 四境详情 | 点击四个场景卡片 | 每个场景详情页正常 |
| 159 | 路线生成 | `/zh-CN/routes` | 表单可填、生成按钮可点、结果显示正常 |
| 160 | 院落预约 | `/zh-CN/booking` | 可选院落、日期、人数，提交后返回 pending 订单 |
| 161 | 树木认养 | `/zh-CN/trees` | 可选树、方案，提交后返回 pending 订单 |
| 162 | 门票预购 | `/zh-CN/tickets` | 可选产品、日期、数量，提交后返回 pending 订单 |
| 163 | 反馈提交 | `/zh-CN/feedback` | 可提交反馈，admin 后台能看到新工单 |
| 164 | 个人中心 | `/zh-CN/me` | 显示订单列表 |
| 165 | 隐私中心 | `/zh-CN/privacy` | 显示隐私同意项 |
| 166 | 语言切换 | 切换到 en / ja | 英文/日文正常显示 |

---

## 九、代码质量

| # | 检查项 | 检查方法 | 通过标准 |
|---|--------|---------|---------|
| 167 | web lint | `cd apps/web && pnpm lint` | 零 error |
| 168 | admin lint | `cd apps/admin && pnpm lint` | 零 error |
| 169 | console.log 残留 | `grep -r "console\.log" apps/admin/src/ apps/web/src/app/api/v1/nodes apps/web/src/app/api/v1/orders apps/web/src/app/api/v1/presence apps/web/src/app/api/v1/reports apps/web/src/app/api/v1/analytics apps/web/src/app/api/v1/cron` | 无调试日志残留 |
| 170 | 硬编码 localhost | `grep -r "localhost:3000" apps/admin/src/ apps/web/src/app/api/v1/nodes apps/web/src/app/api/v1/orders apps/web/src/app/api/v1/presence apps/web/src/app/api/v1/reports` | 新增代码中无硬编码（应通过 env 变量或相对路径） |
| 171 | 未使用的 import | 看 lint 输出或 IDE 提示 | 无警告 |

---

## 检查结果汇总

| 分类 | 共 # 项 | 通过 | 失败 | 备注 |
|------|--------|------|------|------|
| 准备与安全边界 | 10 | | | |
| 数据库与类型 | 16 | | | |
| Seed 数据 | 8 | | | |
| 评分引擎 | 13 | | | |
| API 路由 | 38 | | | |
| Admin Shell | 27 | | | |
| Admin 新页面 | 35 | | | |
| 前台回归 | 10 | | | |
| 代码质量 | 5 | | | |
| **总计** | **162** | | | |

---

## 快速验证命令合集

```bash
# === 一步跑完所有自动化检查 ===

# 1. 构建
pnpm install
cd packages/database && npx prisma db push && npx prisma db seed && npx prisma generate && cd ../..
cd apps/web && pnpm type-check && cd ../..
cd apps/admin && pnpm type-check && cd ../..

# 2. API 检查 (需先启动 web 服务)
# 节点列表
curl -s http://localhost:3000/api/v1/nodes | python -c "import sys,json; d=json.load(sys.stdin); print(f'nodes: {len(d.get(\"data\",[]))}')"

# 创建订单
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"orderType":"courtyard_booking","productId":"test-001","productName":"测试商品","quantity":1,"totalAmount":100}'

# 查询订单
curl -s http://localhost:3000/api/v1/orders | python -c "import sys,json; d=json.load(sys.stdin); print(f'orders: {d.get(\"meta\",{}).get(\"total\",0)}')"

# 上报 presence
NODE_ID=$(curl -s http://localhost:3000/api/v1/nodes | python -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3000/api/v1/presence \
  -H "Content-Type: application/json" \
  -d "{\"nodeId\":\"$NODE_ID\",\"peopleCount\":30,\"dwellAvgMin\":15}"

# 查评分
curl -s "http://localhost:3000/api/v1/nodes/scores?date=$(date +%Y-%m-%d)" | python -c "import sys,json; d=json.load(sys.stdin); print(f'scores: {len(d.get(\"data\",[]))}')"

# 生成日报
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3000/api/v1/reports/generate \
  -H "Content-Type: application/json" -d '{}' | python -c "import sys,json; d=json.load(sys.stdin); print(f'sections: {len(d.get(\"data\",{}).get(\"sections\",[]))}, actions: {len(d.get(\"data\",{}).get(\"actionItems\",[]))}')"

# 最新日报
curl -s http://localhost:3000/api/v1/reports/latest | python -c "import sys,json; d=json.load(sys.stdin); print(f'latest: {d.get(\"data\",{}).get(\"date\",\"none\")}')"

# Cron 鉴权
curl -s -w "\nHTTP %{http_code}" http://localhost:3000/api/v1/cron/daily-report
```
