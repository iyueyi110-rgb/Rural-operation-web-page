import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

const transitions: Record<string, Record<string, string>> = {
  submit: { draft: "reviewing" },
  approve: { draft: "approved", reviewing: "approved" },
  reject: { draft: "rejected", reviewing: "rejected" },
  mark_paid: { approved: "paid" },
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  if (!isAdminRequest(request))
    return apiError(request, "UNAUTHORIZED", "Operator access required", 401)
  const adoptionId = new URL(request.url).searchParams.get("adoptionId")?.trim()
  const data = await prisma.fulfillmentSettlement.findMany({
    where: adoptionId ? { adoptionId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return jsonResponse(request, { data, meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request))
    return apiError(request, "UNAUTHORIZED", "Operator access required", 401)
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.settlementId !== "string" ||
    typeof body.action !== "string"
  ) {
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "settlementId and action are required",
      400,
    )
  }
  const settlement = await prisma.fulfillmentSettlement.findUnique({
    where: { id: body.settlementId.trim() },
    include: { task: true },
  })
  if (!settlement)
    return apiError(
      request,
      "SETTLEMENT_NOT_FOUND",
      "Settlement not found",
      404,
    )
  if (
    settlement.task.status !== "approved" &&
    settlement.task.status !== "settled"
  ) {
    return apiError(
      request,
      "TASK_NOT_APPROVED",
      "Only approved fulfillment tasks can be settled",
      409,
    )
  }
  const next = transitions[body.action]?.[settlement.status]
  if (!next)
    return apiError(
      request,
      "INVALID_TRANSITION",
      "Invalid settlement transition",
      409,
    )
  const actorId = request.headers.get("x-admin-user")?.trim() || "admin"
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.fulfillmentSettlement.update({
      where: { id: settlement.id },
      data: {
        status: next,
        ...(next === "approved"
          ? { approvedBy: actorId, approvedAt: new Date() }
          : {}),
      },
    })
    if (next === "approved" && settlement.task.status === "approved") {
      await tx.task.update({
        where: { id: settlement.taskId },
        data: {
          status: "settled",
          completedAt: new Date(),
          version: { increment: 1 },
        },
      })
    }
    await tx.auditLog.create({
      data: {
        actorId,
        actorType: "operator",
        action: `settlement.${body.action}`,
        targetType: "fulfillment_settlement",
        targetId: settlement.id,
        adoptionId: settlement.adoptionId,
        correlationId: request.headers.get("x-correlation-id"),
        detail: {
          beforeState: settlement.status,
          afterState: next,
          taskId: settlement.taskId,
        },
      },
    })
    return record
  })
  return jsonResponse(request, { data: updated })
}
