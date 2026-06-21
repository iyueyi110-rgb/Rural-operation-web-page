import { prisma, type Prisma } from "@zouma/database"

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

const recommendationSystemPrompt = `你是走马村云脑运营智策助手。根据输入的 F1 村民生产、F2 游客行为、F3 生态感知、F4 农产品反馈和当日日报数据，只生成一张最高优先级智策卡。
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
  return allowedActionEndpoints.has(endpoint)
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

async function collectRecommendationContext(date: string) {
  const { start, end } = getChinaDayRange(date)
  const [
    dailyReport,
    activeVillagers,
    completedTasks,
    presence,
    orders,
    weather,
    activeAlerts,
    sensorReadings,
    feedback,
    products,
  ] = await Promise.all([
    prisma.dailyReport.findUnique({
      where: { date },
      select: { metrics: true, sections: true, actionItems: true },
    }),
    prisma.villager.count({ where: { status: "active" } }),
    prisma.task.findMany({
      where: { status: "completed", updatedAt: { gte: start, lte: end } },
      select: { earnings: true, taskType: true, villagerId: true },
    }),
    prisma.presenceLog.aggregate({
      where: { timestamp: { gte: start, lte: end } },
      _sum: { peopleCount: true },
      _max: { peopleCount: true },
      _avg: { dwellAvgMin: true },
    }),
    prisma.unifiedOrder.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { totalAmount: true, quantity: true },
    }),
    getWeatherSummary(),
    prisma.alert.findMany({
      where: { status: { in: ["active", "acknowledged"] } },
      select: { alertType: true, severity: true, message: true, nodeId: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.sensorReading.findMany({
      where: { createdAt: { gte: start, lte: end } },
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
    prisma.feedbackTicket.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.product.findMany({
      where: { status: "active" },
      select: { id: true, name: true, stockStatus: true, price: true },
      orderBy: { stockStatus: "asc" },
      take: 10,
    }),
  ])

  return {
    date,
    dailyReport,
    F1_villagerProduction: {
      activeVillagers,
      completedTaskCount: completedTasks.length,
      totalEarnings: completedTasks.reduce(
        (sum, task) => sum + task.earnings,
        0,
      ),
      participantCount: new Set(
        completedTasks.map((task) => task.villagerId).filter(Boolean),
      ).size,
      taskTypes: completedTasks.map((task) => task.taskType),
    },
    F2_visitorBehavior: {
      totalVisitors: presence._sum.peopleCount ?? 0,
      peakPeopleCount: presence._max.peopleCount ?? 0,
      averageDwellMinutes: presence._avg.dwellAvgMin ?? 0,
      orderCount: orders._count._all,
      revenue: orders._sum.totalAmount ?? 0,
      quantity: orders._sum.quantity ?? 0,
    },
    F3_ecologicalSensing: { weather, activeAlerts, sensorReadings },
    F4_productFeedback: {
      feedbackCount: feedback._count._all,
      averageRating: feedback._avg.rating ?? 0,
      lowStockProducts: products,
    },
  }
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
