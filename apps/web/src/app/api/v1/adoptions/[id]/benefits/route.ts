import { prisma, type Prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { requireUserSession } from "@web/lib/api-auth"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { isAdminRequest } from "@web/lib/tree-records"

const transitions: Record<string, Record<string, string>> = {
  create: { locked: "available" },
  select: { available: "selected" },
  process: { selected: "processing" },
  deliver: { processing: "delivered" },
  confirm: { delivered: "confirmed" },
  report_exception: { processing: "delivery_exception", delivered: "disputed" },
  resolve: { delivery_exception: "resolved", disputed: "resolved" },
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isFeatureEnabled("ADOPTION_V2_ENABLED"))
    return apiError(
      request,
      "FEATURE_DISABLED",
      "Adoption fulfillment is disabled",
      503,
    )
  const admin = isAdminRequest(request)
  const user = admin ? null : await requireUserSession(request)
  if (!admin && !user)
    return apiError(request, "UNAUTHORIZED", "Authentication required", 401)
  const adoption = await prisma.treeAdoption.findUnique({
    where: { id: params.id },
  })
  if (!adoption)
    return apiError(request, "ADOPTION_NOT_FOUND", "Adoption not found", 404)
  if (!admin && adoption.adopterId !== user!.id)
    return apiError(
      request,
      "FORBIDDEN",
      "Adoption is outside your account",
      403,
    )
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.action !== "string" ||
    typeof body.benefitKey !== "string"
  ) {
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "action and benefitKey are required",
      400,
    )
  }
  const action = body.action
  const benefitKey = body.benefitKey.trim()
  const operatorActions = new Set(["create", "process", "deliver", "resolve"])
  const userActions = new Set(["select", "confirm", "report_exception"])
  if (
    (admin && !operatorActions.has(action)) ||
    (!admin && !userActions.has(action))
  ) {
    return apiError(
      request,
      "FORBIDDEN_ACTION",
      "Role cannot perform this benefit action",
      403,
    )
  }
  const actorId = admin
    ? request.headers.get("x-admin-user")?.trim() || "admin"
    : user!.id
  const benefit = await prisma
    .$transaction(async (tx) => {
      let current = await tx.adoptionBenefit.findUnique({
        where: {
          adoptionId_benefitKey: { adoptionId: adoption.id, benefitKey },
        },
      })
      if (!current && action === "create") {
        current = await tx.adoptionBenefit.create({
          data: {
            adoptionId: adoption.id,
            benefitKey,
            type: typeof body.type === "string" ? body.type.trim() : "harvest",
            status: "locked",
            detailsJson: (isPlainObject(body.details)
              ? body.details
              : {}) as Prisma.InputJsonValue,
          },
        })
      }
      if (!current) throw new Error("BENEFIT_NOT_FOUND")
      const next = transitions[action]?.[current.status]
      if (!next) throw new Error("INVALID_TRANSITION")
      const now = new Date()
      const updated = await tx.adoptionBenefit.update({
        where: { id: current.id },
        data: {
          status: next,
          ...(next === "selected" ? { selectedAt: now } : {}),
          ...(next === "delivered" ? { fulfilledAt: now } : {}),
          ...(next === "confirmed" ? { confirmedAt: now } : {}),
        },
      })
      await tx.auditLog.create({
        data: {
          actorId,
          actorType: admin ? "operator" : "user",
          action: `benefit.${action}`,
          targetType: "adoption_benefit",
          targetId: updated.id,
          adoptionId: adoption.id,
          correlationId: request.headers.get("x-correlation-id"),
          detail: {
            beforeState: current.status,
            afterState: next,
            benefitKey: current.benefitKey,
          },
        },
      })
      return updated
    })
    .catch((error) => (error instanceof Error ? error : new Error("UNKNOWN")))
  if (benefit instanceof Error) {
    const status = benefit.message === "BENEFIT_NOT_FOUND" ? 404 : 409
    return apiError(
      request,
      benefit.message,
      benefit.message.replaceAll("_", " "),
      status,
    )
  }
  return jsonResponse(
    request,
    { data: benefit },
    { status: action === "create" ? 201 : 200 },
  )
}
