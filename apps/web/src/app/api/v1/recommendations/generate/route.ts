import {
  getChinaDateString,
  isPlainObject,
  jsonResponse,
  optionsResponse,
} from "@web/lib/aigc-api"
import { getFallbackResponse } from "@zouma/prompts/fallback-responses"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import {
  generateRecommendations,
  isValidRecommendationDate,
} from "@web/lib/recommendation-generator"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "recommendations-generate"), 5, 300)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const rawBody = await request.text()
  let body: unknown = {}
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody) as unknown
    } catch {
      return jsonResponse(
        request,
        { error: "Invalid JSON payload" },
        { status: 400 },
      )
    }
  }
  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid generation payload" },
      { status: 400 },
    )
  }

  const date =
    typeof body.date === "string" && body.date.trim()
      ? body.date.trim()
      : getChinaDateString()
  if (!isValidRecommendationDate(date)) {
    return jsonResponse(request, { error: "Invalid date" }, { status: 400 })
  }

  try {
    const result = await generateRecommendations(date)
    return jsonResponse(
      request,
      { data: result.recommendation, meta: { created: result.created } },
      { status: result.created ? 201 : 200 },
    )
  } catch (error) {
    console.error("Recommendation generation failed:", error)
    const fallback = getFallbackResponse("recommendation")
    return jsonResponse(request, {
      data: {
        id: `fallback-recommendation-${date}`,
        bizDate: date,
        type: "fallback",
        message: fallback.content,
        actionSteps: ["复核天气、客流、设备与工单数据", "待 AI 服务恢复后重新生成智策"],
        ownerRole: "operator",
        confidence: 0,
        status: "draft",
      },
      meta: { created: false, degraded: true, reason: "AI 服务暂时不可用，显示预设内容" },
    })
  }
}
