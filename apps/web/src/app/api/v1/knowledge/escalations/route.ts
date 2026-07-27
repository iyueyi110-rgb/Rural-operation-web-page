import { prisma } from "@zouma/database"
import { sanitizeKnowledgeQuestion } from "@zouma/knowledge"

import { apiError } from "@web/lib/api-error"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { resolveKnowledgeActor } from "@web/lib/knowledge-auth"

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
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.question !== "string")
    return apiError(request, "INVALID_PAYLOAD", "question is required", 400)
  const content = sanitizeKnowledgeQuestion(body.question).slice(0, 500)
  if (content.length < 2)
    return apiError(
      request,
      "INVALID_QUESTION",
      "Question is empty after sanitization",
      400,
    )
  const ticket = await prisma.feedbackTicket.create({
    data: {
      id: `KN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      source: "knowledge_assistant",
      category: "其他问题",
      severity: "medium",
      content,
      rating: 3,
      status: "submitted",
      ticketType: "knowledge_escalation",
      requestedAction: "manual_review",
      correlationId: request.headers.get("x-correlation-id"),
      taskId:
        typeof body.taskId === "string" ? body.taskId.trim() || null : null,
      adoptionId:
        typeof body.adoptionId === "string"
          ? body.adoptionId.trim() || null
          : null,
      assignee: null,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: "knowledge.escalate",
      targetType: "feedback_ticket",
      targetId: ticket.id,
      adoptionId: ticket.adoptionId,
      correlationId: ticket.correlationId,
      detail: { role: actor.role, taskId: ticket.taskId },
    },
  })
  return jsonResponse(
    request,
    { data: { id: ticket.id, status: ticket.status } },
    { status: 201 },
  )
}
