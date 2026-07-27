import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isFeatureEnabled("ADOPTION_V2_ENABLED"))
    return apiError(
      request,
      "FEATURE_DISABLED",
      "Adoption fulfillment is disabled",
      503,
    )
  if (!isAdminRequest(request))
    return apiError(request, "UNAUTHORIZED", "Operator access required", 401)
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.evidenceId !== "string" ||
    (body.decision !== "approve" && body.decision !== "reject") ||
    (body.decision === "reject" && typeof body.reasonCode !== "string")
  )
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "Valid evidenceId, decision and rejection reason are required",
      400,
    )
  const decision = body.decision

  const evidence = await prisma.fulfillmentEvidence.findUnique({
    where: { id: body.evidenceId.trim() },
    include: { task: true },
  })
  if (!evidence)
    return apiError(request, "EVIDENCE_NOT_FOUND", "Evidence not found", 404)
  if (
    !["submitted", "resubmitted"].includes(evidence.task.status) ||
    evidence.status !== "submitted"
  ) {
    return apiError(
      request,
      "INVALID_TRANSITION",
      "Evidence has already been reviewed",
      409,
    )
  }
  const reviewerId = request.headers.get("x-admin-user")?.trim() || "admin"
  const nextTaskStatus = decision === "approve" ? "approved" : "rejected"
  const nextEvidenceStatus = decision === "approve" ? "approved" : "rejected"

  const review = await prisma
    .$transaction(async (tx) => {
      const changed = await tx.task.updateMany({
        where: {
          id: evidence.taskId,
          version: evidence.task.version,
          status: evidence.task.status,
        },
        data: {
          status: nextTaskStatus,
          version: { increment: 1 },
          ...(decision === "approve" ? { completedAt: new Date() } : {}),
        },
      })
      if (changed.count !== 1) throw new Error("VERSION_CONFLICT")
      await tx.fulfillmentEvidence.update({
        where: { id: evidence.id },
        data: { status: nextEvidenceStatus },
      })
      const created = await tx.fulfillmentReview.create({
        data: {
          evidenceId: evidence.id,
          reviewerId,
          decision,
          reasonCode:
            typeof body.reasonCode === "string" ? body.reasonCode.trim() : null,
          note: typeof body.note === "string" ? body.note.trim() : null,
        },
      })
      if (decision === "approve") {
        const media = Array.isArray(evidence.mediaJson)
          ? evidence.mediaJson
          : []
        const first = media.find(
          (item): item is { url: string } =>
            isPlainObject(item) && typeof item.url === "string",
        )
        await tx.treeCareLog.create({
          data: {
            treeId: evidence.task.treeId!,
            logType: "photo",
            content: evidence.description,
            imageUrl: first?.url,
            operator: reviewerId,
          },
        })
        if (evidence.task.villagerId) {
          await tx.fulfillmentSettlement.upsert({
            where: { taskId: evidence.taskId },
            create: {
              adoptionId: evidence.adoptionId,
              taskId: evidence.taskId,
              villagerId: evidence.task.villagerId,
              amount: evidence.task.earnings,
            },
            update: {},
          })
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          actorType: "operator",
          action: `fulfillment.${decision}`,
          targetType: "fulfillment_evidence",
          targetId: evidence.id,
          adoptionId: evidence.adoptionId,
          correlationId: request.headers.get("x-correlation-id"),
          detail: {
            taskId: evidence.taskId,
            evidenceVersion: evidence.version,
            reasonCode: body.reasonCode ?? null,
          },
        },
      })
      return created
    })
    .catch((error) => {
      if (error instanceof Error && error.message === "VERSION_CONFLICT")
        return null
      throw error
    })
  if (!review)
    return apiError(
      request,
      "VERSION_CONFLICT",
      "Task was updated by another request",
      409,
    )
  return jsonResponse(request, { data: review }, { status: 201 })
}
