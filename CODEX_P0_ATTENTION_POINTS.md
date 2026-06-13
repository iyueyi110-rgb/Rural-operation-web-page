# Codex 执行 P0 注意事项 — 按任务标注

> 配合 `CODEX_P0_AIGC_CLOUD_BRAIN.md` 使用。本文标注每个任务最容易出错的地方和正确做法。

---

## P0.0：准备工作

### 改 `apps/admin/package.json`

| ⚠️ 风险 | 正确做法 |
|---------|---------|
| 重复添加已有依赖 | 只加缺失的三个：`@zouma/database`、`@zouma/utils`、`@zouma/ui`。`@zouma/contracts` 已有，不要动 |
| `workspace` 语法错误 | 写成 `"workspace:*"`，不要写成 `"workspace:^"` 或其他变体 |
| 忘记安装 | 改完必须跑 `pnpm install`，否则 Turborepo 不会重新链接 |

### 改 `apps/admin/next.config.mjs`

| ⚠️ 风险 | 正确做法 |
|---------|---------|
| 覆盖原有配置 | 在现有 `["@zouma/contracts"]` 数组里追加，不要新建数组覆盖 |
| 语法不兼容 | 文件是 `.mjs`，保持 ES module 语法 |

### 改 `.env.example`

无风险，末尾追加一行 `CRON_SECRET=` 即可。

---

## P0.1：数据库

### 改 `packages/database/prisma/schema.prisma`

| 🔴 绝对不能 | 原因 |
|------------|------|
| 修改 `FeedbackTicket` 任何字段 | 破坏现有反馈功能 |
| 修改 `FeedbackHandlingRecord` 任何字段 | 破坏现有反馈功能 |
| 新模型 `@@map()` 名字与现有表冲突 | 数据库报错 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `realm`/`nodeType` 用 Prisma `enum` | 不要用 Prisma enum。用 `String` 类型 + TypeScript union type 在 contracts 层约束，否则 `db push` 会产生额外的 PostgreSQL enum 类型 |
| 漏掉 `@@unique([nodeId, date])` | `NodeDailyScore` 必须有这个复合唯一约束，否则 `upsert` 无法工作 |
| 漏掉 `@@index([nodeId, timestamp])` | `PresenceLog` 按节点+时间查是最高频查询，缺索引会随着数据量增长变慢 |
| 漏掉 `@@index([nodeId, createdAt])` | `UnifiedOrder` 同上 |

### 执行 `db push`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| PostgreSQL 没启动 | 先跑 `docker-compose -f infra/docker/docker-compose.dev.yml up -d` |
| 用了 `prisma migrate dev` | 不要用。`db push` 不生成迁移文件，适合开发阶段。`migrate dev` 会在 `prisma/migrations/` 下生成文件且需要手动确认 |

### 改 `packages/contracts/src/index.ts`

| 🔴 绝对不能 | 原因 |
|------------|------|
| 修改/删除现有类型定义 | 破坏所有引用方 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 新类型名与 Prisma 生成类型冲突 | 用 `SpaceNodeData` 而非 `SpaceNode`，避免与 Prisma client 的类型名混淆 |
| `DailyReportData` 中 `sections`/`actionItems` 用 `Json` 或 `unknown` | 必须定义子接口 `ReportSectionData[]` 和 `ActionItemData[]`，提供类型安全 |

---

## P0.2：Seed 数据

### 新建 `seed-nodes.ts`

| 🔴 绝对不能 | 原因 |
|------------|------|
| 用 `prisma.spaceNode.create()` | 第二次执行 seed 会报 `Unique constraint failed on slug`。必须用 `upsert` |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `realm` 值格式 | 用下划线：`"ancient_road"`, `"lychee_field"`, `"resilience_valley"`, `"ridge_dwelling"`（与 contracts `SceneRealm` 一致） |
| `slug` 值格式 | 用短横线：`"visitor-center"`（URL friendly，非下划线） |
| `nameKey` 填中文 | 填 i18n key 如 `"waypoints.visitorCenter"`，不是中文文本 "游客中心" |
| `upsert` 的 `update` 字段不完整 | 列出所有可变字段（nameKey, realm, nodeType, capacity, risk 值, lat, lng），否则修改 seed 后重新执行不会更新 |
| 四境核心节点 `nameKey` 路径错误 | 确认 `"scenes.detail.ancientRoad.title"` 等 key 在 zh-CN.json 中实际存在 |

### 改 `seed.ts`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `import` 放错位置 | `import { seedNodes }` 放文件顶部与其他 import 一起 |
| 调用位置不对 | `await seedNodes()` 放 `main()` 中现有逻辑之后、`prisma.$disconnect()` 之前 |
| 删了现有 seed 逻辑 | 不要删除或注释 feedback 的 seed |

---

## P0.3：Admin Shell 重构（最高风险）

### 改 `admin-copy.ts`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 只改了 menu 但其他属性坏了 | `menu` 数组整体替换，但 `shell`, `stats`, `table`, `detail`, `categories`, `severities`, `statuses`, `loading`, `errorTitle` 等全部保留不动 |
| 新增文案位置 | 追加在 `} as const` **之前**，不要放到外面 |
| 新增文案有语法错误 | 每个属性之间加逗号，最后一个属性末尾不加逗号 |

### 新建 `admin-sidebar.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `usePathname` 导入源 | 从 `next/navigation` 导入，不是 `next/router` |
| `Link` 导入源 | 从 `next/link` 导入 |
| Dashboard 高亮逻辑 | `item.key === "dashboard"` 时用 `pathname === "/"` 判断；其他用 `pathname.startsWith(href)`。因为 `/` 匹配所有路径，不能用 `startsWith` |
| lucide 图标缺漏 | 新增图标：`MapPin`(nodes), `ShoppingCart`(orders), `FileText`(reports), `Cpu`(infrastructure)。原有的 `LayoutDashboard`(dashboard), `ClipboardList`(feedback) 保留 |
| 旧图标残留 | `Ticket`, `Trees`, `Users` 对应的菜单已移除，可从 import 中删除 |

### 新建 `admin-shell.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 忘了 `"use client"` | 必须加，因为用了 `useRouter` + `useState` |
| 刷新逻辑不生效 | `<section key={refreshKey}>` — `key` 变化让子组件重新挂载；同时调 `router.refresh()` 让 Server Components 重新渲染。两者配合才能全面刷新 |
| 刷新后子页面没重新 fetch | `key` 变化 → 组件卸载+重新挂载 → `useEffect` 重新执行 → 重新 fetch。如果不加 `key`，`useEffect` 不会重新触发 |

### 改 `layout.tsx`

| 🔴 绝对不能 | 原因 |
|------------|------|
| 加 `"use client"` | layout 是 Server Component，引用 Client Component（`<AdminShell>`）没问题，但自身必须是 Server Component |
| 删除字体 | `Noto_Sans_SC` 是中文字体，删了会导致中文显示异常 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| import `AdminShell` 路径 | 从 `"./admin-shell"` 导入 |

### 改 `page.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| import 另一个 page 组件 | 不要 `<DashboardPage />` 或 `import { DashboardPage } from "./dashboard/page"`。用 `redirect("/dashboard")` |
| `redirect` 导入源 | 从 `next/navigation` 导入 |

### 改 `feedback-admin.tsx`（最危险的操作）

| 🔴 绝对不能删/改 | 原因 |
|-----------------|------|
| `loadRecords` 函数 | 核心业务逻辑 |
| `updateStatus` 函数 | 核心业务逻辑 |
| `stats` useMemo | 统计数据计算 |
| `selectedRecord` useMemo | 选中逻辑 |
| `statusOrder` / `statusTone` / `severityTone` / `formatDate` | 显示映射 |
| 表格 JSX（表头 + `records.map` 渲染 + 选中高亮 + `onClick`） | 核心 UI |
| 详情面板 JSX（`selectedRecord` 信息 + `textarea` + 状态按钮 + 时间线） | 核心 UI |
| `Stat` / `Cell` / `Meta` 内部组件 | 共享的内部组件 |

| ✅ 只能删这三样 | 大约行数 |
|---------------|---------|
| 外层 `<main>` 和 `<aside>` sidebar JSX | ~30 行 |
| `<header>` 区（标题 + 刷新按钮） | ~10 行 |
| `menuIcons` 对象定义 | ~7 行 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 不确定哪些该删 | **宁可少删**——多保留的代码只是冗余，误删会导致功能丢失 |
| 改 `export function FeedbackAdmin` | 改为 `export function FeedbackContent`，组件名和导出名一起改 |

### 改 `feedback/page.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| import 路径 | `"../feedback-admin"` 不变 |
| import 名称 | `FeedbackAdmin` → `FeedbackContent` |
| 调用 | `<FeedbackAdmin />` → `<FeedbackContent />` |

---

## P0.4：API 路由

### 通用规则（所有 route.ts 都适用）

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| API 放错位置 | 放在 `apps/web/src/app/api/v1/` 下，**不是** `apps/admin` 下 |
| 漏了 CORS | 每个 `route.ts` 都必须导出 `OPTIONS` 函数。复制 `feedback/route.ts` 的 `getCorsHeaders`、`jsonResponse`、`OPTIONS` 模式 |
| Prisma import | `import { prisma } from "@zouma/database"` |
| 日期时区 | 用 `new Date(\`${date}T00:00:00+08:00\`)` 明确指定 +08:00，不要依赖系统时区 |

### 4.1 `GET /api/v1/nodes`

无特殊风险，简单的 findMany。

### 4.2 `POST + GET /api/v1/orders`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `POST` nodeId 没校验 | 如果传了 nodeId，需要验证在 SpaceNode 中存在。不存在的 nodeId 返回 400 |
| `POST` orderType 用 switch 漏 default | 用 `["courtyard_booking", "tree_adoption", "ticket_order"].includes(body.orderType)` 判断 |
| `GET` 日期筛选时区错误 | 用 `+08:00` 明确指定 |
| `GET` 不 include node | `include: { node: true }` 让前端能显示点位名称 |

### 4.3 `GET /api/v1/analytics/consumption/by-node`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| groupBy 不支持 include | 先 `groupBy` 拿到 `[{nodeId, _sum, _count}]`，再单独查 SpaceNode 补齐 nodeName |
| `_sum.totalAmount` 为 null | 用 `?? 0` 兜底 |
| nodeId 为 null 的订单 | `groupBy` 会产生一个 null 组（没有点位标签的订单），注意处理 |

### 4.4 `POST + GET /api/v1/presence`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `POST` 不校验 nodeId | `const node = await prisma.spaceNode.findUnique({ where: { id: body.nodeId } })`，不存在返回 400 |
| `POST` 同步等待评分计算 | 用 fire-and-forget：`computeNodeDailyScores(today).catch(console.error)`，不要 await（会让 API 响应等很久） |
| `GET latest=true` 逻辑 | 有 nodeId → 对该节点取最新；无 nodeId → 对所有节点取最新 |

### 4.5 `GET /api/v1/presence/series`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| nodeId 没校验必填 | 缺失返回 400 |
| 时间范围查询 | from/to 都不传时返回所有数据（但数据量可能大，建议加默认 limit） |

### 4.6 `GET /api/v1/nodes/scores`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 查不到评分时忘了触发计算 | `await computeNodeDailyScores(date)` 然后重新查询。**要 await**（需要返回结果给前端） |
| 不 include node | `include: { node: true }` |

### 4.7 `GET /api/v1/nodes/scores/[slug]`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 直接用 slug 查 NodeDailyScore | NodeDailyScore 关联的是 nodeId 不是 slug。必须先查 SpaceNode 拿 nodeId，再查 NodeDailyScore |
| 节点不存在 | 返回 404 |

### 4.8 `POST + GET /api/v1/reports`

| 🔴 高风险 | 正确做法 |
|----------|---------|
| AI 返回的 JSON 解析失败 | **必须加 try-catch**。DeepSeek 可能：① 在 JSON 外包 \`\`\`json ... \`\`\` ② 在 JSON 后加注释 ③ 返回不完整 JSON |
| 解析策略 | ① 直接 `JSON.parse(content)` ② 正则提取 \`\`\`json ... \`\`\` ③ 提取第一个 `{` 到最后一个 `}` ④ 都失败 → 503 + 原始 content |
| Prisma Json 字段 | 传 JS 对象即可，Prisma 自动序列化，不需要 `JSON.stringify` |
| 聚合查询空值 | `_sum.peopleCount` 可能为 null，用 `?? 0` |
| 前端等超时 | 日报生成耗时 10-30 秒，前端需要显示 loading 状态 |

### 4.9 `GET /api/v1/reports/latest`

无特殊风险。

### 4.10 `GET /api/v1/cron/daily-report`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| Secret 空时不校验 | `if (!process.env.CRON_SECRET)` 也返回 401 |
| 生成逻辑重复 | 提取共享函数 `generateDailyReport(date)` 到 `apps/web/src/lib/report-generator.ts`，`reports/route.ts` POST 和 `cron/` GET 都调用它 |

---

## P0.5：评分引擎

### 新建 `packages/utils/src/scoring-engine.ts`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 除以 0 | `Math.max(input.capacity, 1)` 兜底 |
| 归一化值超过 1 | 所有归一化值用 `Math.min(x, 1)` |
| 忘记 `"server-only"` | 必须在文件顶部加 `import "server-only"` |

### 新建 `apps/web/src/lib/node-scoring.ts`

| 🔴 绝对不能 | 原因 |
|------------|------|
| 放到 `packages/utils/src/` | `@zouma/utils` 不能依赖 `@zouma/database`。DB 查询逻辑必须放 web app |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `upsert` 的 where | 用 `nodeId_date` 复合唯一键：`{ nodeId_date: { nodeId: node.id, date } }` |
| 无数据节点跳过 | `if (logs.length === 0) continue` — 不需要创建 0 分记录 |
| 日期范围 | 与 API 一致，用 `+08:00` |
| 忘记 `"server-only"` | 必须加 |

### 改 `packages/utils/src/index.ts`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 覆盖现有导出 | 追加导出 `computeScores` 和类型，不改 `cn` 和 `ModelProviderAdapter` 的导出 |

---

## P0.6：Prompt 模板

### 新建 `packages/prompts/daily-report.ts`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 模板字符串语法 | 反引号内不要有未转义的反引号 |
| JSON 示例有 trailing comma | 去掉所有末尾逗号，否则 DeepSeek 可能模仿输出非法 JSON |

### 新建 `packages/prompts/package.json`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `name` 错误 | 必须是 `"@zouma/prompts"` |
| `main` 和 `types` | 指向 `"./daily-report.ts"` |

### 别忘记：`apps/web/package.json` 加依赖

`reports/route.ts` 需要 import 这个 prompt，所以 `apps/web/package.json` 要加：

```json
"@zouma/prompts": "workspace:*"
```

---

## P0.7：Admin 页面

### 通用规则（所有页面适用）

| 🔴 绝对不能 | 原因 |
|------------|------|
| 页面空白 | 必须处理 loading / error / empty 三种状态 |
| 定义重复组件 | 用 P0.8 的 `AdminStatCard` 和 `AdminDataTable`，不要在页面内重复定义 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 忘了 `"use client"` | 每个页面都需要 |
| API base | `process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"` |
| 样式不一致 | 用与 `feedback-admin.tsx` 相同的 color token 和 shadow |
| 一个 API 挂了全崩 | 多个 API 用 `Promise.allSettled` 而非 `Promise.all` |

### 7.1 Dashboard

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 4 个指标卡片加载 | 用 `Promise.allSettled`，单个失败显示 "—" 而不是白屏 |
| "生成日报"按钮 | 等 10-30 秒，必须显示 loading + disabled + 旋转图标 |
| TOP5 无数据 | 显示 `adminCopy.dashboard.noData`，不要空白列表 |
| 安全风险分颜色 | `< 30` = `text-moss`(绿), `30-70` = `text-yellow-500`(黄), `> 70` = `text-lychee`(红) |

### 7.2 Nodes

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 节点中文名显示 | `nameKey` 是 i18n key 不是中文。API 层面或前端做 key→中文映射（admin 无 next-intl，需自己处理） |

### 7.3 Orders

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 筛选不触发重新 fetch | `useEffect` 依赖 `[orderType, nodeId, date]` |
| "全部类型" | 传空字符串或不传 orderType param |
| ID 太长撑破表格 | 截断显示前 8 位，完整 ID 放 `title` 属性 |

### 7.4 Reports

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 生成按钮 loading | 同 Dashboard，10-30 秒等待 |
| actionItems priority 颜色 | `high` = `lychee`, `medium` = `water`, `low` = `ink/40` |
| JSON 解析失败 | 显示原始内容 + 错误提示，不要白屏 |

### 7.5 Infrastructure

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 无数据时显示 "0" | 应显示 `adminCopy.infrastructure.pending`（"硬件待接入"），这是业务状态不是缺数据 |

### 7.6 Settings

| 🔴 绝对不能 | 原因 |
|------------|------|
| 显示 API key 值 | 安全风险。只显示"已配置"/"未配置" |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 前端无法读 `DEEPSEEK_API_KEY` | 非 `NEXT_PUBLIC_` 前缀的变量前端读不到。Settings 页面只显示 `NEXT_PUBLIC_*` 变量状态 |

---

## P0.8：共享组件

### `admin-stat-card.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `value` 类型 | 接受 `string \| number`，数字可能需 `toLocaleString()` |
| icon 为 undefined | 不传时不渲染 icon 区域，不要显示空白占位 |

### `admin-data-table.tsx`

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 泛型语法 | `TableColumn<T>` 和 `AdminDataTable<T extends Record<string, unknown>>` |
| 列宽动态 | 用 inline `style={{ gridTemplateColumns }}`，不用 Tailwind 固定类 |
| `selectedId` 类型匹配 | `String(row.id)` 统一转字符串比较 |
| `render` 未定义时 | `String(row[col.key] ?? "")` 兜底 |
| `onRowClick` 未传 | 不传时行样式用 `cursor-default` |

---

## 跨任务通用注意事项

| # | 规则 |
|---|------|
| 1 | 🔴 **不动 `apps/web/` 下任何现有文件** — 除了在 `api/v1/` 下新增 route.ts 和 `lib/` 下新增 2 个文件 |
| 2 | 🔴 **不动 Prisma schema 现有模型** — 只追加 |
| 3 | 🔴 **不删 feedback-admin.tsx 业务逻辑** — 只删外层 layout |
| 4 | ⚠️ 所有 `fetch` 加 `try-catch`，网络错误显示友好提示 |
| 5 | ⚠️ `catch (error)` 中 `error` 类型为 `unknown`，需类型守卫 |
| 6 | ⚠️ 日期字符串统一 `YYYY-MM-DD`，时区统一 `+08:00` |
| 7 | ⚠️ pnpm monorepo alias：`@admin/` = `apps/admin/src/`，`@web/` = `apps/web/src/`，`@zouma/` = 包名 |
