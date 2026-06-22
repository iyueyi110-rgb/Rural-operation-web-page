import { prisma, type Prisma } from "@zouma/database"
import type { WeatherAlertData } from "@zouma/contracts"

import { extractJsonContent } from "./ai-json"
import { getWeatherSummary } from "./weather"

const recommendationTypes = [
  "weather_plan",
  "crowd_diversion",
  "inventory_alert",
  "maintenance",
] as const

const allowedActionEndpoints = new Set([
  "/api/v1/scenes/promotion/active",
  "/api/v1/tasks",
  "/api/v1/notifications",
  "/api/v1/alerts",
])

const recommendationSystemPrompt = `你是走马村云脑运营智策助手。根据输入的 F1 村民生产、F2 游客行为、F3 生态感知、F4 农产品反馈和 F5 运营智策闭环数据，只生成一张最高优先级智策卡。
严格返回 JSON 对象，不要 Markdown。必须包含：
- type: weather_plan | crowd_diversion | inventory_alert | maintenance
- target_object: string 或 null
- evidence_metrics: 只放可核验的输入指标（Evidence）
- message: 对证据与问题的简洁解释
- action_steps: 至少一项，每项含 action；需要系统动作时可含 api_trigger_endpoint、method、payload（Action）
- owner_role: operator | villager
- expected_impact: 可衡量的预期影响（Impact）
- confidence: 0 到 1
api_trigger_endpoint 只能从 /api/v1/scenes/promotion/active、/api/v1/tasks、/api/v1/notifications、/api/v1/alerts 中选择；没有安全动作时省略该字段。`

type RecommendationType = (typeof recommendationTypes)[number]
type RecommendationReviewAction = "approve" | "reject"

interface RecommendationActionStep {
  action: string
  api_trigger_endpoint?: string
  method?: "POST" | "PATCH"
  payload?: Record<string, unknown>
}

export interface NormalizedRecommendationPayload {
  type: RecommendationType
  targetObject: string | null
  evidenceJson: Record<string, unknown>
  message: string
  actionSteps: RecommendationActionStep[]
  ownerRole: string
  expectedImpact: string
  confidence: number
}

interface RecommendationFlows {
  villagerProduction: unknown
  visitorBehavior: unknown
  ecologicalSensing: unknown
  productFeedback: unknown
  operatingIntelligence: unknown
}

export function assembleRecommendationContext(
  date: string,
  flows: RecommendationFlows,
) {
  return {
    date,
    F1_villagerProduction: flows.villagerProduction,
    F2_visitorBehavior: flows.visitorBehavior,
    F3_ecologicalSensing: flows.ecologicalSensing,
    F4_productFeedback: flows.productFeedback,
    F5_operatingIntelligence: flows.operatingIntelligence,
  }
}

export function normalizeRecommendationPayload(
  value: unknown,
): NormalizedRecommendationPayload {
  if (!isPlainObject(value)) {
    throw new Error("Recommendation payload is not an object")
  }

  const type = isRecommendationType(value.type) ? value.type : null
  const evidenceJson = isPlainObject(value.evidence_metrics)
    ? value.evidence_metrics
    : null
  const message = typeof value.message === "string" ? value.message.trim() : ""
  const rawSteps = Array.isArray(value.action_steps) ? value.action_steps : []
  const expectedImpact =
    typeof value.expected_impact === "string"
      ? value.expected_impact.trim()
      : ""
  const confidence =
    typeof value.confidence === "number" ? value.confidence : Number.NaN

  const actionSteps = rawSteps
    .filter(isPlainObject)
    .map((step): RecommendationActionStep | null => {
      const action = typeof step.action === "string" ? step.action.trim() : ""
      if (!action) return null

      const endpoint =
        typeof step.api_trigger_endpoint === "string"
          ? step.api_trigger_endpoint.trim()
          : undefined
      const method =
        step.method === "PATCH"
          ? "PATCH"
          : step.method === "POST"
            ? "POST"
            : undefined

      return {
        action,
        ...(endpoint ? { api_trigger_endpoint: endpoint } : {}),
        ...(method ? { method } : {}),
        ...(isPlainObject(step.payload) ? { payload: step.payload } : {}),
      }
    })
    .filter((step): step is RecommendationActionStep => step !== null)

  if (
    !type ||
    !evidenceJson ||
    Object.keys(evidenceJson).length === 0 ||
    !message ||
    actionSteps.length === 0 ||
    !expectedImpact ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error("Recommendation payload is missing required fields")
  }

  return {
    type,
    targetObject:
      typeof value.target_object === "string" && value.target_object.trim()
        ? value.target_object.trim()
        : null,
    evidenceJson,
    message,
    actionSteps,
    ownerRole:
      typeof value.owner_role === "string" && value.owner_role.trim()
        ? value.owner_role.trim()
        : "operator",
    expectedImpact,
    confidence,
  }
}

export function isAllowedRecommendationEndpoint(endpoint: string) {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return false
  if (endpoint.includes("..")) return false

  const path = endpoint.split("?")[0]
  return allowedActionEndpoints.has(path)
}

export function isValidRecommendationDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function shouldSkipRecommendationGeneration(status?: string) {
  return status === "draft" || status === "approved"
}

export function getRecommendationReviewStatus(
  currentStatus: string,
  action: RecommendationReviewAction,
) {
  if (currentStatus !== "draft") return null
  return action === "approve" ? "approved" : "rejected"
}

export function scheduleRecommendationGeneration(
  date: string,
  generate: (bizDate: string) => Promise<unknown> = generateRecommendations,
  onError: (error: unknown) => void = (error) =>
    console.error("Failed to generate recommendations:", error),
) {
  void generate(date).catch(onError)
}

export function scheduleWeatherRecommendationGeneration(
  date: string,
  alerts: WeatherAlertData[],
  generate: (
    bizDate: string,
    weatherAlerts: WeatherAlertData[],
  ) => Promise<unknown> = generateWeatherRecommendations,
  onError: (error: unknown) => void = (error) =>
    console.error("Weather recommendation failed:", error),
) {
  void generate(date, alerts).catch(onError)
}

export function buildWeatherRecommendationPayload(
  date: string,
  alerts: WeatherAlertData[],
): NormalizedRecommendationPayload {
  if (!isValidRecommendationDate(date) || alerts.length === 0) {
    throw new Error("Weather recommendation requires a date and alerts")
  }

  const severityRank: Record<WeatherAlertData["severity"], number> = {
    low: 1,
    medium: 2,
    high: 3,
  }
  const strongest = [...alerts].sort(
    (left, right) => severityRank[right.severity] - severityRank[left.severity],
  )[0]

  return {
    type: "weather_plan",
    targetObject: "走马村全域",
    evidenceJson: {
      bizDate: date,
      weatherAlertCount: alerts.length,
      highestSeverity: strongest.severity,
      alertTypes: alerts.map((alert) => alert.type),
      warningIds: alerts.map((alert) => alert.id),
    },
    message: `${strongest.title}：${strongest.text}`,
    actionSteps: [
      { action: "复核预警影响范围，调整当日路线、活动和采摘安排" },
      { action: "通知现场运营与村民负责人，确认临水、高温或大风风险点" },
    ],
    ownerRole: "operator",
    expectedImpact: "30 分钟内完成预警响应与现场复核，降低游客和生产风险。",
    confidence: strongest.severity === "high" ? 0.95 : 0.88,
  }
}

export async function generateWeatherRecommendations(
  date: string,
  weatherAlerts: WeatherAlertData[],
) {
  if (!isValidRecommendationDate(date)) {
    throw new Error("Invalid recommendation date")
  }
  if (weatherAlerts.length === 0) {
    return { recommendation: null, created: false }
  }

  const existing = await prisma.recommendation.findFirst({
    where: {
      bizDate: date,
      type: "weather_plan",
      status: { in: ["draft", "approved"] },
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return { recommendation: existing, created: false }

  const payload = buildWeatherRecommendationPayload(date, weatherAlerts)
  const recommendation = await prisma.recommendation.create({
    data: {
      bizDate: date,
      type: payload.type,
      targetObject: payload.targetObject,
      evidenceJson: payload.evidenceJson as Prisma.InputJsonValue,
      message: payload.message,
      actionSteps: payload.actionSteps as unknown as Prisma.InputJsonValue,
      ownerRole: payload.ownerRole,
      expectedImpact: payload.expectedImpact,
      confidence: payload.confidence,
      status: "draft",
    },
  })

  return { recommendation, created: true }
}

export async function generateRecommendations(date: string) {
  if (!isValidRecommendationDate(date)) {
    throw new Error("Invalid recommendation date")
  }

  const existing = await prisma.recommendation.findFirst({
    where: { bizDate: date, status: { in: ["draft", "approved"] } },
    orderBy: { createdAt: "desc" },
  })

  if (existing && shouldSkipRecommendationGeneration(existing.status)) {
    return { recommendation: existing, created: false }
  }

  const context = await collectRecommendationContext(date)
  const { ModelProviderAdapter } = await import("@zouma/utils")
  const result = await ModelProviderAdapter.complete(JSON.stringify(context), {
    systemPrompt: recommendationSystemPrompt,
    temperature: 0.15,
  })
  const payload = normalizeRecommendationPayload(
    extractJsonContent(result.content),
  )

  const recommendation = await prisma.recommendation.create({
    data: {
      bizDate: date,
      type: payload.type,
      targetObject: payload.targetObject,
      evidenceJson: payload.evidenceJson as Prisma.InputJsonValue,
      message: payload.message,
      actionSteps: payload.actionSteps as unknown as Prisma.InputJsonValue,
      ownerRole: payload.ownerRole,
      expectedImpact: payload.expectedImpact,
      confidence: payload.confidence,
      status: "draft",
    },
  })

  return { recommendation, created: true }
}

export async function collectRecommendationContext(date: string) {
  const range = getChinaDayRange(date)
  const [
    villagerProduction,
    visitorBehavior,
    ecologicalSensing,
    productFeedback,
    operatingIntelligence,
  ] = await Promise.all([
    collectVillagerProduction(date, range),
    collectVisitorBehavior(range),
    collectEcologicalSensing(range),
    collectProductFeedback(range),
    collectOperatingIntelligence(date),
  ])

  return assembleRecommendationContext(date, {
    villagerProduction,
    visitorBehavior,
    ecologicalSensing,
    productFeedback,
    operatingIntelligence,
  })
}

async function collectVillagerProduction(
  date: string,
  range: ReturnType<typeof getChinaDayRange>,
) {
  const [activeVillagers, completedTasks, farmingCalendar] = await Promise.all([
    prisma.villager.count({ where: { status: "active" } }),
    prisma.task.findMany({
      where: {
        status: "completed",
        updatedAt: { gte: range.start, lte: range.end },
      },
      select: { earnings: true, taskType: true, villagerId: true },
    }),
    prisma.farmingCalendar.findMany({
      where: {
        OR: [
          { startDate: { gte: date } },
          { startDate: { lte: date }, endDate: { gte: date } },
        ],
      },
      select: {
        title: true,
        activityType: true,
        startDate: true,
        endDate: true,
        treeSpecies: true,
        status: true,
      },
      orderBy: { startDate: "asc" },
      take: 10,
    }),
  ])

  return {
    activeVillagers,
    completedTaskCount: completedTasks.length,
    totalEarnings: completedTasks.reduce((sum, task) => sum + task.earnings, 0),
    participantCount: new Set(
      completedTasks.map((task) => task.villagerId).filter(Boolean),
    ).size,
    taskTypes: completedTasks.map((task) => task.taskType),
    farmingCalendar,
  }
}

async function collectVisitorBehavior(
  range: ReturnType<typeof getChinaDayRange>,
) {
  const [presence, orders, routeLogs, interactionTasks] = await Promise.all([
    prisma.presenceLog.aggregate({
      where: { timestamp: { gte: range.start, lte: range.end } },
      _sum: { peopleCount: true },
      _max: { peopleCount: true },
      _avg: { dwellAvgMin: true },
    }),
    prisma.unifiedOrder.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { _all: true },
      _sum: { totalAmount: true, quantity: true },
    }),
    prisma.routeGenerationLog.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      select: {
        routeId: true,
        duration: true,
        audience: true,
        weather: true,
        provider: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.visitorInteractionTask.findMany({
      where: {
        OR: [
          { createdAt: { gte: range.start, lte: range.end } },
          { completedAt: { gte: range.start, lte: range.end } },
        ],
      },
      select: { taskType: true, status: true, points: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ])

  return {
    totalVisitors: presence._sum.peopleCount ?? 0,
    peakPeopleCount: presence._max.peopleCount ?? 0,
    averageDwellMinutes: presence._avg.dwellAvgMin ?? 0,
    orderCount: orders._count._all,
    revenue: orders._sum.totalAmount ?? 0,
    quantity: orders._sum.quantity ?? 0,
    routeGenerationCount: routeLogs.length,
    routeGenerations: routeLogs,
    interactionTaskCount: interactionTasks.length,
    completedInteractionCount: interactionTasks.filter(
      (task) => task.status === "completed",
    ).length,
    interactionPoints: interactionTasks.reduce(
      (sum, task) => sum + task.points,
      0,
    ),
    interactionTypes: interactionTasks.map((task) => task.taskType),
  }
}

async function collectEcologicalSensing(
  range: ReturnType<typeof getChinaDayRange>,
) {
  const [weather, activeAlerts, sensorReadings] = await Promise.all([
    getWeatherSummary(),
    prisma.alert.findMany({
      where: { status: { in: ["active", "acknowledged"] } },
      select: {
        alertType: true,
        severity: true,
        message: true,
        nodeId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.sensorReading.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      select: {
        type: true,
        value: true,
        unit: true,
        nodeId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return { weather, activeAlerts, sensorReadings }
}

async function collectProductFeedback(
  range: ReturnType<typeof getChinaDayRange>,
) {
  const [feedback, activeProductCount, lowStockProducts, productOrders] =
    await Promise.all([
      prisma.feedbackTicket.findMany({
        where: { createdAt: { gte: range.start, lte: range.end } },
        select: { rating: true, severity: true, category: true },
        take: 100,
      }),
      prisma.product.count({ where: { status: "active" } }),
      prisma.product.findMany({
        where: { status: "active", stockStatus: { not: "available" } },
        select: { id: true, name: true, stockStatus: true, price: true },
        orderBy: { stockStatus: "asc" },
        take: 10,
      }),
      prisma.unifiedOrder.aggregate({
        where: {
          orderType: "product_order",
          createdAt: { gte: range.start, lte: range.end },
        },
        _count: { _all: true },
        _sum: { totalAmount: true, quantity: true },
      }),
    ])

  return {
    feedbackCount: feedback.length,
    averageRating: feedback.length
      ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
      : 0,
    highPriorityFeedback: feedback.filter((item) =>
      ["high", "urgent"].includes(item.severity),
    ).length,
    feedbackCategories: feedback.map((item) => item.category),
    activeProductCount,
    lowStockProducts,
    productOrderCount: productOrders._count._all,
    productOrderRevenue: productOrders._sum.totalAmount ?? 0,
    productOrderQuantity: productOrders._sum.quantity ?? 0,
  }
}

async function collectOperatingIntelligence(date: string) {
  const [dailyReport, recommendationHistory] = await Promise.all([
    prisma.dailyReport.findUnique({
      where: { date },
      select: {
        metrics: true,
        sections: true,
        actionItems: true,
        status: true,
      },
    }),
    prisma.recommendation.findMany({
      where: { bizDate: date },
      select: {
        type: true,
        status: true,
        expectedImpact: true,
        confidence: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return { dailyReport, recommendationHistory }
}

function isRecommendationType(value: unknown): value is RecommendationType {
  return recommendationTypes.includes(value as RecommendationType)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getChinaDayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+08:00`),
    end: new Date(`${date}T23:59:59.999+08:00`),
  }
}
