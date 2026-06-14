# 走马村 AIGC 云脑 P4 — AI 智能增强 执行指令

## P4 总体验收标准

| # | 验收项 |
|---|--------|
| 1 | 我的认养页面展示代寄物流状态 |
| 2 | 低风险告警自动解决（夜间滞留次日自动关闭、拥堵回落后自动关闭） |
| 3 | AI 养护建议纳入日报（"LZ-026 距上次修剪 45 天，建议本周安排"） |
| 4 | 新反馈提交后 AI 自动建议分类+严重程度+推荐处理人 |
| 5 | AI 客流预测次日人数（"预计明日 80-120 人"） |
| 6 | AI 异常检测替代硬阈值（"今日 14:00 人数是该时段均值的 5 倍"） |
| 7 | AI 设备健康预测（"电池 3 天连降，预计 2 天内离线"） |
| 8 | Admin 自然语言查询（"哪个节点转化率最低"→AI 查询 DB 返回结果） |

---

## P4.0：物流追踪补漏（P3 遗留）

### 改动

修改 `apps/web/src/app/[locale]/me/adoption-lookup.tsx`：

1. `AdoptionRecord` 接口追加：
```ts
harvestBookings?: Array<{
  id: string
  scheduledDate: string
  status: string
  shipment?: {
    status: string
    courier?: string
    trackingNumber?: string
  }
}>
```

2. 查询时附带查 harvest-bookings：调用 `GET /api/v1/harvest-bookings?treeCode=X` 或扩展 `GET /api/v1/tree-adoptions` 返回值包含关联的 harvest booking 和 shipment。

3. 渲染物流状态条：
```
待采摘 ▸ 采摘中 ▸ 运输中（顺丰 SF123456）▸ 已送达 ✓
```

---

## P4.1：自动解决引擎

### 新建 `apps/web/src/lib/auto-resolution.ts`

```ts
import "server-only"

// 定时任务：cron 调用或每日日报前调用
// 逐条检查 active 告警 → 判断是否可自动解决 → 写 resolutionNote → 更新状态

export async function runAutoResolution(date: string): Promise<number> {
  const activeAlerts = await prisma.alert.findMany({
    where: { status: "active" },
  })

  let resolved = 0

  for (const alert of activeAlerts) {
    // 规则 1：夜间滞留 + severity=low/medium + 当前时间已是次日 06:00 之后
    if (alert.alertType === "night_linger" && alert.severity !== "high") {
      const now = new Date()
      if (now.getHours() >= 6) {
        await resolveAlert(alert.id, "次日清晨自动关闭：夜间滞留已于白天自动解除")
        resolved++
        continue
      }
    }

    // 规则 2：拥堵告警 + severity=low + 超过 30 分钟
    if (alert.alertType === "crowd" && alert.severity === "low") {
      const age = Date.now() - alert.createdAt.getTime()
      if (age > 30 * 60 * 1000) {
        await resolveAlert(alert.id, "30分钟后自动关闭：短期拥堵已缓解")
        resolved++
        continue
      }
    }

    // 规则 3：天气预警 + QWeather 预警已过期
    if (["rainstorm", "heat", "wind", "typhoon", "flood_risk", "fire_risk"].includes(alert.alertType)) {
      const activeWeatherAlerts = await fetchWeatherAlerts()
      const relatedActive = activeWeatherAlerts.find(
        (w) => alert.message.includes(w.title ?? "") || alert.message.includes(w.text ?? "")
      )
      if (!relatedActive) {
        await resolveAlert(alert.id, "天气预警已解除，自动关闭")
        resolved++
        continue
      }
    }

    // 规则 3.5：水利灌溉建议（rule_engine 来源）→ 自动批准
    if (alert.alertType === "flood_risk" || alert.alertType === "fire_risk") {
      const pendingCommands = await prisma.controlCommand.findMany({
        where: { status: "pending", triggeredBy: "rule_engine" },
      })
      for (const cmd of pendingCommands) {
        await prisma.controlCommand.update({
          where: { id: cmd.id },
          data: { status: "approved" },
        })
        await resolveAlert(alert.id, `自动批准：水利调度建议（rule_engine）已自动审批。原建议：${cmd.reason}`)
        resolved++
      }
      // 如果当前 alert 已被处理，跳过后续
      continue
    }

    // 规则 4：high 级别告警超过 2 小时 → 升级提醒（不改状态，追加 message）
    if (alert.severity === "high") {
      const age = Date.now() - alert.createdAt.getTime()
      if (age > 2 * 60 * 60 * 1000 && !alert.message.includes("⚠️升级")) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { message: `⚠️升级提醒（${Math.floor(age / 3600000)}h 未确认）：${alert.message}` },
        })
      }
    }
  }

  // 规则 5：日报 low 优先级 actionItem 连续 3 天未处理 → 自动关闭
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const oldReports = await prisma.dailyReport.findMany({
    where: { date: { lte: threeDaysAgo.toISOString().slice(0, 10) } },
  })
  let closedActions = 0
  for (const report of oldReports) {
    const actionItems = (report.actionItems as Array<{ priority?: string; action?: string; status?: string }>) ?? []
    const updated = actionItems.map((item) => {
      if (item.priority === "low" && item.status !== "closed") {
        closedActions++
        return { ...item, status: "closed", closedAt: new Date().toISOString(), closeReason: "连续 3 天未处理，自动关闭" }
      }
      return item
    })
    if (closedActions > 0) {
      await prisma.dailyReport.update({
        where: { id: report.id },
        data: { actionItems: updated as never },
      })
    }
  }

  return resolved + closedActions
}

async function resolveAlert(alertId: string, note: string) {
  const existing = await prisma.alert.findUnique({ where: { id: alertId } })
  if (!existing) return
  await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      message: `${note} | 原消息：${existing.message}`,
    },
  })
}
```

### Cron 集成

修改 `cron/daily-report/route.ts`，生成日报前调用：
```ts
const autoResolved = await runAutoResolution(date)
```

---

## P4.2：AI 养护建议

### 新建 `apps/web/src/lib/care-advisor.ts`

```ts
import "server-only"
import { ModelProviderAdapter } from "@zouma/utils"
import { getWeatherCondition } from "@web/lib/weather"

export async function generateCareAdvice(): Promise<string> {
  // 收集：所有树木的最近养护日志 + 天气 + 农事日历
  const trees = await prisma.orchardTree.findMany({
    include: { careLogs: { orderBy: { createdAt: "desc" }, take: 5 } },
  })
  const calendar = await prisma.farmingCalendar.findMany({
    where: { status: { in: ["upcoming", "active"] } },
    orderBy: { startDate: "asc" },
  })
  const weather = await getWeatherCondition(new Date().toISOString().slice(0, 10))

  const context = trees.map((tree) => ({
    treeCode: tree.treeCode,
    species: tree.species,
    lastCareLogs: tree.careLogs.map((log) => ({
      logType: log.logType,
      content: log.content,
      createdAt: log.createdAt.toISOString().slice(0, 10),
    })),
  }))

  const prompt = `根据以下树木养护数据和天气条件，给出 3-5 条本周养护建议（每条一行，包含树木编号和具体操作）。天气：${weather}。农事日历：${JSON.stringify(calendar.map(c => c.title))}。树木数据：${JSON.stringify(context)}。`

  try {
    const result = await ModelProviderAdapter.complete(prompt, {
      systemPrompt: "你是走马村果园养护专家。根据养护日志、天气和农事日历，给出具体可执行的养护建议。",
      temperature: 0.3,
    })
    return result.content.trim()
  } catch {
    return "AI 养护建议暂时不可用。"
  }
}
```

### 日报集成

修改 `report-generator.ts`：sections 追加 `{ type: "feedback", title: "AI 养护建议", content: await generateCareAdvice() }`

---

## P4.3：AI 反馈自动分派

### 修改 `apps/web/src/app/api/v1/feedback/route.ts` POST

```ts
// 在创建 feedback 后，异步调用 AI 分析：
async function suggestFeedbackMeta(content: string) {
  try {
    const result = await ModelProviderAdapter.complete(
      `分析以下游客反馈，返回 JSON：{"category":"内容讲解|服务接待|设施导视|支付订单|其他问题","severity":"low|medium|high|urgent","urgencyReason":"一句话理由"}\n反馈内容：${content}`,
      { systemPrompt: "你是走马村游客反馈分析助手。只返回 JSON。" }
    )
    return JSON.parse(extractJsonContent(result.content))
  } catch { return null }
}

// 在 POST 返回前：
// const aiSuggestion = await suggestFeedbackMeta(content).catch(() => null)
// 写入 handlingRecords 第一条 note 中：`AI 建议：${aiSuggestion.category}/${aiSuggestion.severity} — ${aiSuggestion.urgencyReason}`
```

> 不改变用户提交的 category/severity，AI 建议作为参考追加到第一条 handlingRecord 的 note 中。

---

## P4.4：AI 客流预测

### 新建 `apps/web/src/lib/traffic-forecast.ts`

```ts
export async function predictTomorrowTraffic(): Promise<{ low: number; high: number; confidence: string }> {
  // 查询过去 14 天每日总客流
  const dailyTraffic = await Promise.all(
    Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i - 1)
      return date.toISOString().slice(0, 10)
    }).map(async (date) => {
      const { start, end } = getChinaDayRange(date)
      const agg = await prisma.presenceLog.aggregate({
        where: { timestamp: { gte: start, lte: end } },
        _sum: { peopleCount: true },
      })
      return { date, total: agg._sum.peopleCount ?? 0 }
    })
  )

  const weather = await getWeatherSummary()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isWeekend = [0, 6].includes(tomorrow.getDay())

  const prompt = `过去 14 天客流：${JSON.stringify(dailyTraffic)}。明日天气：${weather.summary}。明日是${isWeekend ? "周末" : "工作日"}。预测明日总客流，返回 JSON：{"low":80,"high":120,"confidence":"high|medium|low"}。`

  try {
    const result = await ModelProviderAdapter.complete(prompt, {
      systemPrompt: "你是走马村客流预测助手。根据历史数据和天气返回客流预测。只返回 JSON。",
    })
    return JSON.parse(extractJsonContent(result.content))
  } catch {
    return { low: 50, high: 100, confidence: "low" }
  }
}
```

### 日报集成

日报 context 追加 `trafficForecast`，section 追加预测展示。

---

## P4.5：AI 异常检测

### 修改 `alert-engine.ts`

在现有三个硬阈值检测器（night_linger/crowd/waterside）之后追加 AI 异常检测：

```ts
// AI 异常检测：每日一次（不在每次 presence POST 时跑）
export async function runAnomalyDetection(date: string) {
  const { start, end } = getChinaDayRange(date)
  const logs = await prisma.presenceLog.findMany({
    where: { timestamp: { gte: start, lte: end } },
    include: { node: true },
  })

  // 按节点+小时分组
  const hourlyByNode = new Map<string, Map<number, number>>()
  for (const log of logs) {
    const hour = new Date(log.timestamp).getHours()
    const nodeId = log.nodeId
    if (!hourlyByNode.has(nodeId)) hourlyByNode.set(nodeId, new Map())
    const hours = hourlyByNode.get(nodeId)!
    hours.set(hour, (hours.get(hour) ?? 0) + log.peopleCount)
  }

  // 对每个节点-小时组合，与过去 14 天同时段均值对比
  for (const [nodeId, hours] of hourlyByNode) {
    for (const [hour, count] of hours) {
      const historicalAvg = await getHistoricalAvg(nodeId, hour, date) // 查前 14 天同时段
      if (historicalAvg > 0 && count > historicalAvg * 3) {
        await createAlertIfAbsent({
          alertType: "crowd",
          nodeId,
          severity: "high",
          message: `AI 异常检测：${hour}:00 客流 ${count} 人是同时段均值 ${Math.round(historicalAvg)} 的 ${(count / historicalAvg).toFixed(1)} 倍`,
          dayStart: start,
        })
      }
    }
  }
}
```

> `getHistoricalAvg`：查 `presence_log` 表前 14 天同 nodeId + 同小时的数据取均值。

---

## P4.6：AI 设备健康预测

### 新建 `apps/web/src/lib/device-predictor.ts`

```ts
export async function predictDeviceIssues(): Promise<string[]> {
  const devices = await prisma.device.findMany({
    where: { status: "active" },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 20 } },
  })

  const warnings: string[] = []

  for (const device of devices) {
    // 检测电压趋势（如果有 battery 类型读数）
    const batteryReadings = device.readings.filter((r) => r.type === "battery")
    if (batteryReadings.length >= 3) {
      const trend = batteryReadings.slice(0, 3).map((r) => r.value)
      if (trend[0] < trend[1] && trend[1] < trend[2]) {
        const dropRate = (trend[2] - trend[0]) / 3
        const daysLeft = Math.floor(trend[2] / Math.abs(dropRate))
        if (daysLeft <= 5) {
          warnings.push(`设备 ${device.name}（${device.deviceId}）电压连续下降，预计 ${daysLeft} 天内离线`)
        }
      }
    }
  }

  return warnings
}
```

### 日报集成

设备离线检测追加 AI 预测项。

---

## P4.7：AI 自然语言查询

### 新增 API

`POST /api/v1/ai/query`

```ts
// 请求体：{ question: "哪个节点转化率最低" }
// AI 解析问题 → 确定需要查什么 → 查 DB → AI 用自然语言总结结果
export async function POST(request: Request) {
  const { question } = await request.json()

  // Step 1: AI 解析问题 → 确定调哪个 API/查什么
  const plan = await aiParseQuery(question) // → { endpoint: "/analytics/cross/flow-vs-spend", params: {...} }

  // Step 2: 执行查询
  const data = await executeDataQuery(plan)

  // Step 3: AI 总结结果
  const answer = await aiSummarize(question, data)

  return jsonResponse(request, { data: { question, answer } })
}
```

简化版：不动态调 API，直接把关键数据摘要发给 AI + question，让 AI 从上下文中提取答案。

```ts
async function aiQuery(question: string) {
  // 拉取关键数据摘要（节点评分 + 消费交叉分析 + 订单 + 告警 + 天气）
  const context = await fetchDashboardSummary()
  
  const prompt = `你是走马村数据分析助手。根据以下数据回答用户问题。\n问题：${question}\n数据：${JSON.stringify(context)}\n用中文回答，引用具体数字，不超过 200 字。`
  
  const result = await ModelProviderAdapter.complete(prompt, {
    systemPrompt: "你是走马村 AIGC 云脑数据分析助手。根据运营数据回答运营人员的问题。",
  })
  return result.content
}
```

### Admin

| 文件 | 改动 |
|------|------|
| 新建 `apps/admin/src/app/ai-assistant/page.tsx` | AI 助手页面：输入框 + 历史对话 + 结果展示 |
| 修改 sidebar + admin-copy | 新增菜单 `aiAssistant: "AI 助手"`，图标 `Bot` |

---

## 执行顺序

```
P4.0 物流补漏       (独立，先修)
    ↓
P4.1 自动解决引擎   (独立)
    ↓
P4.2 AI 养护建议    (依赖日报)
P4.3 AI 反馈分派    (独立)
P4.4 AI 客流预测    (依赖日报)
P4.5 AI 异常检测    (依赖 alert-engine)
P4.6 AI 设备预测    (依赖日报)
    ↓
P4.7 AI 助手        (独立，最后)
```

---

## 完整验证

```bash
# 1. 物流追踪
# → http://localhost:3000/zh-CN/me → 查认养 → 看到代寄物流状态条

# 2. 自动解决
# → 创建一条 low 级别夜间滞留告警 → 次日 06:00 后调 cron → 告警自动 resolved

# 3. AI 养护建议
# → 生成日报 → sections 包含 AI 养护建议

# 4. AI 反馈分派
# → 前台提交一条 feedback → Admin 查看 → 第一条 handlingRecord note 含"AI 建议"

# 5. AI 客流预测
# → 日报 metrics 含 trafficForecast → 页面展示明日预测

# 6. AI 异常检测
# → 注入异常偏高 presence 数据 → 跑 anomaly detection → 生成"AI 异常检测"告警

# 7. AI 设备预测
# → 设备有连续下降的 battery 读数 → 日报 actionItems 含设备预警

# 8. AI 助手
# → http://localhost:3001/ai-assistant → 输入"哪个节点转化率最低" → 返回分析结果
```
