import {
  getChinaDateString,
  isPlainObject,
  jsonResponse,
  optionsResponse,
} from "@web/lib/aigc-api"
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
    return jsonResponse(
      request,
      {
        error: {
          code: "RECOMMENDATION_GENERATION_FAILED",
          message:
            error instanceof Error ? error.message : "AI service unavailable.",
        },
      },
      { status: 503 },
    )
  }
}
