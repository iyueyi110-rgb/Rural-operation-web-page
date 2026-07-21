import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { transitionAdoption } from "@web/lib/adoption-workflow"
import { requireUserSession } from "@web/lib/api-auth"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { sanitizeContent } from "@web/lib/feedback-store"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUserSession(request)
  if (!user)
    return apiError(request, "UNAUTHORIZED", "Authentication required", 401)
  const adoption = await prisma.treeAdoption.findUnique({
    where: { id: params.id },
  })
  if (!adoption)
    return apiError(request, "ADOPTION_NOT_FOUND", "Adoption not found", 404)
  if (adoption.adopterId !== user.id)
    return apiError(
      request,
      "FORBIDDEN",
      "Adoption is outside your account",
      403,
    )
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 4
  ) {
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "A refund reason is required",
      400,
    )
  }
  const correlationId = crypto.randomUUID()
  const transitioned = await transitionAdoption({
    adoptionId: adoption.id,
    action: "request_refund",
    expectedVersion: adoption.version,
    actorId: user.id,
    actorType: "user",
    reason: body.reason.trim(),
    correlationId,
  }).catch(() => null)
  if (!transitioned)
    return apiError(
      request,
      "INVALID_TRANSITION",
      "Refund cannot be requested from the current state",
      409,
    )
  const ticket = await prisma.feedbackTicket.create({
    data: {
      id: `RF-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      source: "adoption",
      category: "支付订单",
      severity: "medium",
      content: sanitizeContent(body.reason).slice(0, 500),
      rating: 3,
      status: "submitted",
      adoptionId: adoption.id,
      ticketType: "refund_request",
      requestedAction: "refund_review",
      correlationId,
    },
  })
  return jsonResponse(
    request,
    {
      data: {
        ticketId: ticket.id,
        adoptionStatus: transitioned.status,
        requiresHumanApproval: true,
      },
    },
    { status: 201 },
  )
}
