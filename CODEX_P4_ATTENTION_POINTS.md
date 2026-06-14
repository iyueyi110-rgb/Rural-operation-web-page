# Codex 执行 P4 注意事项 — 按任务标注

> 🔴=绝对不能做  ⚠️=容易出错

---

## P4.0：物流追踪补漏

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 查 harvest-booking 时没关联 shipment | 用 `include: { shipment: true }`。`HarvestBooking` 模型已有 `shipment HarvestShipment?` 反向关联 |
| 物流状态条的空状态 | 没有代寄单时显示"暂无代寄物流"，不是空白 |
| 状态条文字映射 | `pending→待采摘`, `picking→采摘中`, `shipping→运输中（${courier} ${trackingNumber}）`, `delivered→已送达 ✓` |

---

## P4.1：自动解决引擎

| 🔴 绝对不能 | 原因 |
|------------|------|
| 自动 resolve high 级别告警 | 高风险告警必须人工确认。只自动解决 low/medium |
| 静默删除告警 | 每次自动 resolve 必须追加审计记录到 message 字段或单独的 resolutionNote |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 夜间滞留判断只看小时 | 用 `Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", hour: "2-digit" })` 获取北京时间。不用 `new Date().getHours()`（服务器可能 UTC） |
| 天气告警过期判断 | `fetchWeatherAlerts()` 可能返回空数组（无预警时）。空数组意味着所有天气告警都可关闭 |
| 告警升级只追加 message | 不在 status 上做升级标记。追加 `⚠️升级提醒（Xh 未确认）` 前缀到 message |
| 定时触发频率 | `runAutoResolution` 通过 cron（每日一次）调用，不在每次 presence POST 时跑 |
| 水利灌溉自动批准范围 | 只批准 `triggeredBy: "rule_engine"` 的 ControlCommand。`triggeredBy: "ai"` 的仍需人工 |
| 日报 actionItem 关闭条件 | `priority === "low"` AND `status !== "closed"` AND 日报日期 ≥ 3 天前。不关闭 medium/high |
| actionItem 状态字段 | 原 `actionItems` 没有 `status` 字段，自动关闭时追加 `status: "closed" + closedAt + closeReason`。AI 生成的新 actionItem 也要有 `status: "active"` 初始值 |
| `resolveAlert` 的 message 更新 | Prisma 不支持 `{ set: ... }` 拼接。需要先读 old message，再 `data: { message: newNote + " | 原消息：" + existing.message }` |

---

## P4.2：AI 养护建议

| 🔴 绝对不能 | 原因 |
|------------|------|
| AI 建议直接发给游客 | 养护建议是给运营看的，放到日报里（Admin 可见）。不推送到前台树木页面 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| AI 生成失败时日报报错 | `generateCareAdvice()` 用 try-catch 包裹，失败返回 "AI 养护建议暂时不可用。"。日报正常生成 |
| 养护日志为空时 AI 无上下文 | 传给 AI 的树木数据可能全是空日志 → 此时 AI 仍可根据农事日历+天气给出通用建议 |
| 建议格式 | prompt 要求"每条一行"，方便日报展示。不做复杂结构化 JSON |

---

## P4.3：AI 反馈自动分派

| 🔴 绝对不能 | 原因 |
|------------|------|
| AI 覆盖用户提交的 category/severity | AI 建议是**参考**，写入 `handlingRecords` 第一条 note 中。不改 `feedback_ticket` 的 category/severity 字段 |
| AI 分派阻塞反馈提交 | 用 `.catch(() => null)` fire-and-forget。反馈提交在 AI 分析之前就返回 201 |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| AI 返回的 JSON 格式不稳定 | 用 `extractJsonContent`（已有函数在 `report-generator.ts`）解析 |
| AI 分派的 handlingRecord 与系统自动创建的混在一起 | 在 `POST /api/v1/feedback/route.ts` 中，第一条 handlingRecord 的 note 追加 AI 建议：`"前台反馈已入库。AI 建议：内容讲解/medium — 涉及导视标识不清，建议转运营值班"` |

---

## P4.4：AI 客流预测

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 历史数据不足 14 天 | 实际数据可能只有几天。用 `Array.from` 生成日期列表时，无数据的日期 total=0。AI 能处理稀疏数据 |
| 周末判断 | `tomorrow.getDay() === 0 || tomorrow.getDay() === 6`。getDay() 返回 0(周日)-6(周六) |
| 预测结果用在日报中的展示 | 展示格式："预计明日客流 {low}-{high} 人，置信度 {confidence}（高/中/低）" |
| AI 不可用时 | 返回简单的移动平均兜底：`{ low: avg * 0.8, high: avg * 1.2, confidence: "low" }` |

---

## P4.5：AI 异常检测

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 历史均值查询性能 | `getHistoricalAvg(nodeId, hour, date)` 查 14 天 × 24 小时 = 最多 336 条聚合查询。用单个 SQL：`SELECT AVG(people_count) FROM presence_log WHERE node_id = X AND EXTRACT(HOUR FROM timestamp) = H AND timestamp BETWEEN start AND end`。Prisma 的 `$queryRaw` 或分步查 |
| 异常倍数阈值 | 均值 > 0 且 当前值 > 均值 × 3。阈值可配置常量。太低会产生大量误报，太高会漏掉真异常 |
| 每节点-小时最多报一次 | 用 `createAlertIfAbsent`（已有函数）。同一 nodeId+同一 alertType+同一天只生成一条 |
| 非高峰时段误报 | 凌晨 2 点均值 0 人，今天凌晨有 1 人 → 1 > 0×3=true。加最低绝对值门槛：当前值 > 10 才报异常 |

---

## P4.6：AI 设备健康预测

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| 设备可能没有 battery 读数 | `device.readings.filter(r => r.type === "battery")` 可能为空 → 跳过该设备 |
| 电压趋势方向 | 连续下降（每个值都小于前一个）才告警。偶尔波动不算 |
| 预测天数不能为负 | `daysLeft = Math.floor(当前值 / Math.abs(下降速率))`。如果下降速率接近 0，`daysLeft` 会变成 Infinity → 跳过不报 |
| 阈值 | 预计 ≤ 5 天离线才报。≤ 1 天→高优先级，2-3 天→中，4-5 天→低 |

---

## P4.7：AI 助手

| 🔴 绝对不能 | 原因 |
|------------|------|
| AI 直接执行 DB 查询 | DeepSeek 不能直接连数据库。流程是：AI 分析问题 → 代码拉取关键数据摘要 → AI 从摘要中提取答案。永远不要让 AI 生成 SQL |

| ⚠️ 容易出错 | 正确做法 |
|------------|---------|
| Admin 输入的自由文本 | 用户可能问任何问题（包括无关的）。AI 回答不出的问题回 "抱歉，当前数据暂不支持该查询。" |
| `fetchDashboardSummary` 的性能 | 每次查询拉取：节点评分 TOP5 + 消费汇总 + 今日客流 + 活跃告警 + 天气。约 5-6 个并行查询。用 `Promise.all` |
| AI 回答超时 | `ModelProviderAdapter.complete` 可能 30 秒。Admin 页面设置 30 秒超时 + loading 状态 |
| 对话历史 | P4 不做多轮对话。每次查询独立，不保存上下文 |
| 数据隐私 | AI 上下文不包含村民姓名、手机号、完整收货地址等 PII。用脱敏版本 |

---

## 跨任务通用

| # | 规则 |
|---|------|
| 1 | 🔴 **所有 AI 调用必须 try-catch** — AI 不可用时系统正常降级，不白屏不报错 |
| 2 | 🔴 **AI 建议不直接做决策** — 养护/分派/预测都是建议，不自动执行实际操作 |
| 3 | 🔴 **不动 P0/P1/P2/P3 模型** — 只追加新的 lib 文件和修改日报/告警引擎 |
| 4 | ⚠️ `extractJsonContent` 已存在于 `report-generator.ts`，其他模块需要复用或提取为共享函数 |
| 5 | ⚠️ AI 调用的 temperature：养护建议=0.3（较确定），客流预测=0.2（需要精确），异常检测=0.2，助手=0.4（需要灵活） |
| 6 | ⚠️ 每日 AI 调用次数：养护(1) + 客流预测(1) + 异常检测(1) + 设备预测(1) = 约 4 次/天的额外调用。Feedbak 自动分派(每次 feedback POST 1 次)。AI 助手(按需) |
| 7 | ⚠️ P4.1-P4.6 的逻辑在 cron 或日报生成时触发，不在每次 API 请求时触发。P4.3 在 feedback POST 时异步触发 |
