# Codex 执行 P3 注意事项 — 按任务标注

> 配合 `CODEX_P3_INSTRUCTIONS.md` 使用。🔴=绝对不能做  ⚠️=容易出错

---

## P3.0：村民模型

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `Villager.skills` 使用数组 | Prisma 不支持 `String[]`，用 `Json @default("[]")`。读写时：存 `JSON.stringify(skills)` 或直接传 JS 数组（Prisma Json 列自动序列化）。读时 Prisma 自动反序列化为 JS 数组 |
| `Villager.phone` PII 脱敏 | Admin 列表展示时用 `maskPhone`（已有函数在 `tree-records.ts`）。API 返回时完整的 phone 仅 Admin 可见，前台不展示 |
| `Villager.nodeId` 关联 | 关联到 SpaceNode（工作区域）。可选——村民可能负责多个节点 |
| `Task.assignedTo` 引用 | 用 `Villager.id`（cuid），不是 `Villager.phone`。关联字段：`assignedTo String?` + `villager Villager? @relation(fields: [assignedTo], references: [id])` |
| Admin 村民表单的技能选择 | 用 checkbox 多选：`["cooking", "farming", "guiding", "handicraft", "logistics"]`。不要用自由文本输入 |

---

## P3.1：农事日历

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 24 节气的日期不固定 | 每年节气日期浮动 1-2 天。P3 用 `startDate: String`（YYYY-MM-DD）手动设置，不做自动计算。Admin 录入时自行查当年节气表 |
| 前台日历展示性能 | 按 `startDate` 排序 + 按 `status` 筛选。用前端过滤而非后端多次查询 |
| `activityType` 枚举 | 用 String：`"planting" | "pruning" | "fertilizing" | "harvesting" | "processing" | "festival"`。不建 Prisma enum |
| 前台 `/calendar` 页面的 i18n | 24 节气名在中文/英文/日文中的翻译不同。`zh-CN` 直接用中文节气名，`en`/`ja` 需要对应的翻译。至少 `zh-CN` 要完整 |
| Admin 日期选择 | 用 `<input type="date">` 组件。`startDate`/`endDate` 格式统一为 `YYYY-MM-DD` |

---

## P3.2：AI 内容工厂

| 🔴 绝对不能 | 原因 |
|------------|------|
| AI 生成失败时白屏 | `ModelProviderAdapter.complete()` 可能超时（DeepSeek 10-30s）或抛错。必须 try-catch + 错误提示 |
| 用 AI 生成的文本直接发布 | AI 输出可能包含不存在的场景描述或错误信息。Admin 必须有编辑区让运营人员人工审核修改后再用 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 三种内容类型的 prompt 模板 | 放在 `packages/prompts/content-factory.ts`，与 `daily-report.ts` 同级。不要硬编码在 API route 中 |
| `POST /api/v1/ai/generate-content` 的参数 | `type` 必填（narration/script/social），`scene`/`activity`/`season` 为可选上下文。不传上下文时 AI 生成通用内容 |
| 生成的 latencyMs 展示 | API 返回 `latencyMs`，Admin 展示"生成耗时 X 秒"，方便运营感知 AI 响应速度 |
| 历史记录 | P3 不做数据库存储。刷新 Admin 页面后生成结果消失——在页面上提示"结果不会保存，请复制后使用" |
| 社交文案的字数控制 | prompt 中指定 100-200 字。DeepSeek 可能超字数，Admin 编辑区可手动裁剪 |

---

## P3.3：代摘代寄

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `HarvestShipment.harvestBookingId` 唯一约束 | 一个采摘预约只能创建一个代寄单。用 `@unique` 约束 |
| 收货信息 PII | `recipientName`/`recipientPhone`/`recipientAddress` 都属于个人隐私。API 返回时：Admin 可见完整信息，前台只展示姓名的姓+手机尾号后 4 位 |
| 物流状态流转 | `pending → picking → shipping → delivered`。不允许跳过状态（如 pending 直接到 delivered）。Admin PATCH 接口做状态机校验 |
| 快递公司/单号 | `courier`（快递公司名）和 `trackingNumber`（快递单号）在 `picking → shipping` 时必填。API 校验：状态变更为 `shipping` 时必须传 courier+trackingNumber |
| 前台"我的认养"物流展示 | 用文字状态条：`待采摘 → 采摘中 → 运输中（顺丰 SF123456）→ 已送达`。不接入快递 API |
| 代寄费 | P3 不计算代寄费。前台展示"代寄费到付"或 Admin 手动填写 |

---

## P3.4：任务调度

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| `Task.status` 状态机 | `pending → accepted → in_progress → completed`。`cancelled` 可以从 `pending` 或 `accepted` 进入。completed 后不可再变更 |
| `Task.earnings` | 可选字段。收益由 Admin 手动填写（元），不做自动计算。P3 不接入分账系统 |
| 分配村民时校验 `assignedTo` | `assignedTo` 必须是存在的 `Villager.id`。`POST/PATCH` 时查 `prisma.villager.findUnique` 验证 |
| Admin 任务看板的筛选 | 支持三种筛选：按状态（下拉）、按分配村民（下拉）、按任务类型（下拉）。用前端 `useState` + `useEffect` 重新 fetch |
| 收益统计 | `GET /api/v1/villagers/[id]/tasks` 返回该村民的任务列表+`totalEarnings`（SUM）。API 中做聚合，不在前端计算 |
| `dueDate` 格式 | 用 `YYYY-MM-DD` String，不用 DateTime。与 `FarmingCalendar.startDate` 保持一致 |

---

## P3.5：收益统计

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 日报中的村民收益 | 不推送村民个人收益到日报（隐私）。日报只汇总：当日完成 X 个任务，总收益 Y 元，参与村民 Z 人 |
| Villagers 页面收益卡片 | 选中村民后展示：本月完成任务数 + 本月总收益 + 任务类型分布。数据从 `GET /api/v1/villagers/[id]/tasks` 获取 |

---

## 跨任务通用注意事项

| # | 规则 |
|---|------|
| 1 | 🔴 **不动 P0/P1/P2 模型和 API** — 只追加新模型、新 API、新页面 |
| 2 | 🔴 **PII 脱敏**：`Villager.phone`、`HarvestShipment.recipientPhone`/`recipientAddress`、`Task.earnings` — Admin 可见完整信息，前台脱敏展示 |
| 3 | ⚠️ 所有新 API 复用 `aigc-api.ts` 的 CORS 模式 |
| 4 | ⚠️ 所有 Admin 新页面用 `AdminDataTable` + `AdminStatCard` 共享组件（P0 已建） |
| 5 | ⚠️ 日期统一 `YYYY-MM-DD` String，时区 `+08:00` |
| 6 | ⚠️ `Villager.skills` 为 `Json` 列（存 JS 数组），读写时 Prisma 自动序列化/反序列化。不要手动 `JSON.stringify` |
| 7 | ⚠️ `Task.earnings` 用 `Float`，精度足够（收益以元为单位，保留两位小数） |
| 8 | ⚠️ AI 内容工厂不存储历史记录 — 在 Admin 页面提示"结果不会保存，请复制后使用" |
| 9 | ⚠️ 代寄物流不接入真实快递 API — 快递单号由 Admin 手动录入 |
| 10 | ⚠️ 不实现自动分账系统 — 收益由 Admin 手动填写 `Task.earnings` |
