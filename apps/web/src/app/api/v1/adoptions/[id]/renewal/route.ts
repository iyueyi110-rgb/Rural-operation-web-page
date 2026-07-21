import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { requireUserSession } from "@web/lib/api-auth"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { isAdminRequest } from "@web/lib/tree-records"

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
  if (!isPlainObject(body) || typeof body.action !== "string")
    return apiError(request, "INVALID_PAYLOAD", "action is required", 400)
  if (
    (!admin && body.action !== "request") ||
    (admin && !["accept", "decline", "expire"].includes(body.action))
  ) {
    return apiError(
      request,
      "FORBIDDEN_ACTION",
      "Role cannot perform this renewal action",
      403,
    )
  }
  const result = await prisma
    .$transaction(async (tx) => {
      let renewal = await tx.adoptionRenewal.findUnique({
        where: { previousAdoptionId: adoption.id },
      })
      if (body.action === "request") {
        if (adoption.status !== "fulfilled")
          throw new Error("INVALID_TRANSITION")
        renewal = await tx.adoptionRenewal.upsert({
          where: { previousAdoptionId: adoption.id },
          create: {
            previousAdoptionId: adoption.id,
            dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
          },
          update: {},
        })
        await tx.treeAdoption.update({
          where: { id: adoption.id },
          data: { status: "renewal_pending", version: { increment: 1 } },
        })
      } else {
        if (!renewal || renewal.status !== "pending")
          throw new Error("INVALID_TRANSITION")
        const status =
          body.action === "accept"
            ? "accepted"
            : body.action === "decline"
              ? "declined"
              : "expired"
        renewal = await tx.adoptionRenewal.update({
          where: { id: renewal.id },
          data: {
            status,
            newAdoptionId:
              body.action === "accept" && typeof body.newAdoptionId === "string"
                ? body.newAdoptionId
                : null,
          },
        })
        await tx.treeAdoption.update({
          where: { id: adoption.id },
          data: {
            status:
              body.action === "accept"
                ? "renewed"
                : body.action === "expire"
                  ? "expired"
                  : "fulfilled",
            version: { increment: 1 },
          },
        })
      }
      const actorId = admin
        ? request.headers.get("x-admin-user")?.trim() || "admin"
        : user!.id
      await tx.auditLog.create({
        data: {
          actorId,
          actorType: admin ? "operator" : "user",
          action: `renewal.${body.action}`,
          targetType: "adoption_renewal",
          targetId: renewal!.id,
          adoptionId: adoption.id,
          correlationId: request.headers.get("x-correlation-id"),
          detail: { status: renewal!.status },
        },
      })
      return renewal!
    })
    .catch((error) => (error instanceof Error ? error : new Error("UNKNOWN")))
  if (result instanceof Error)
    return apiError(request, result.message, "Invalid renewal transition", 409)
  return jsonResponse(
    request,
    { data: result },
    { status: body.action === "request" ? 201 : 200 },
  )
}
