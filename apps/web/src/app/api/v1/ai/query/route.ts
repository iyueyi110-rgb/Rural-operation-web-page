import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getFallbackResponse } from "@zouma/prompts/fallback-responses"
import { answerOperationalQuestion } from "@web/lib/ai-query"
import { requireBearerAuth } from "@web/lib/api-auth"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { isAdminRequest } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    const auth = await requireBearerAuth(request)
    if (!auth.authorized) return auth.response
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "ai-query"), 10, 60)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.question !== "string") {
    return jsonResponse(request, { error: "Invalid AI query payload" }, { status: 400 })
  }

  const question = body.question.trim()
  if (question.length < 2 || question.length > 200) {
    return jsonResponse(request, { error: "Question length must be between 2 and 200 characters" }, { status: 400 })
  }

  try {
    const answer = await answerOperationalQuestion(question)
    return jsonResponse(request, { data: { question, answer } })
  } catch (error) {
    console.error("AI query fallback activated:", error)
    const fallback = getFallbackResponse("ai_query")
    return jsonResponse(request, {
      data: { question, answer: fallback.content, source: fallback.source },
      meta: { degraded: true, reason: "AI 服务暂时不可用，显示预设内容" },
    })
  }
}
