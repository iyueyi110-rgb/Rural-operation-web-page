import { answerKnowledgeQuestion, type KnowledgeIndex } from "@zouma/knowledge"
import knowledgeIndex from "@zouma/knowledge/index"

import { apiError } from "@web/lib/api-error"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { resolveKnowledgeActor } from "@web/lib/knowledge-auth"
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@web/lib/rate-limit"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isFeatureEnabled("KNOWLEDGE_ASSISTANT_ENABLED"))
    return apiError(
      request,
      "FEATURE_DISABLED",
      "Knowledge assistant is disabled",
      503,
    )
  const actor = await resolveKnowledgeActor(request)
  if (!actor)
    return apiError(
      request,
      "UNAUTHORIZED",
      "Operator or villager access required",
      401,
    )
  const rateLimit = await checkRateLimit(
    getRateLimitKey(request, "knowledge-query"),
    12,
    60,
  )
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.question !== "string")
    return apiError(request, "INVALID_PAYLOAD", "question is required", 400)
  const question = body.question.trim()
  if (question.length < 2 || question.length > 500)
    return apiError(
      request,
      "INVALID_QUESTION",
      "Question length must be between 2 and 500 characters",
      400,
    )
  const context =
    isPlainObject(body.context) && typeof body.context.taskType === "string"
      ? { taskType: body.context.taskType.slice(0, 40) }
      : undefined
  const allowDraft =
    process.env.NODE_ENV !== "production" &&
    process.env.KNOWLEDGE_DEMO_MODE !== "false"
  const result = await answerKnowledgeQuestion({
    index: knowledgeIndex as KnowledgeIndex,
    question,
    role: actor.role,
    context,
    allowDraft,
  })
  return jsonResponse(request, result)
}
