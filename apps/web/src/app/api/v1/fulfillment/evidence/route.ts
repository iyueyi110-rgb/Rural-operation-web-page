import { prisma, type Prisma } from "@zouma/database"
import type { FulfillmentMediaItem } from "@zouma/contracts"

import { apiError } from "@web/lib/api-error"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { isAdminRequest } from "@web/lib/tree-records"

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  if (!isAdminRequest(request))
    return apiError(request, "UNAUTHORIZED", "Operator access required", 401)
  const taskId = new URL(request.url).searchParams.get("taskId")?.trim()
  if (!taskId)
    return apiError(request, "INVALID_QUERY", "taskId is required", 400)
  const data = await prisma.fulfillmentEvidence.findMany({
    where: { taskId },
    include: { reviews: { orderBy: { createdAt: "asc" } } },
    orderBy: { version: "desc" },
  })
  return jsonResponse(request, { data, meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isFeatureEnabled("ADOPTION_V2_ENABLED")) {
    return apiError(
      request,
      "FEATURE_DISABLED",
      "Adoption fulfillment is disabled",
      503,
    )
  }
  const villagerId = await getVillagerIdFromToken(request)
  if (!villagerId)
    return apiError(request, "UNAUTHORIZED", "Authentication required", 401)
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.taskId !== "string" ||
    typeof body.description !== "string"
  ) {
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "taskId and description are required",
      400,
    )
  }
  const media = parseMedia(body.media)
  const description = body.description
  if (!media || media.length < 2) {
    return apiError(
      request,
      "INVALID_MEDIA",
      "At least two valid images are required",
      400,
    )
  }
  const task = await prisma.task.findFirst({
    where: { id: body.taskId.trim(), villagerId },
    select: { id: true, adoptionId: true, status: true, version: true },
  })
  if (!task?.adoptionId)
    return apiError(request, "TASK_NOT_FOUND", "Adoption task not found", 404)
  const nextStatus =
    task.status === "in_progress"
      ? "submitted"
      : task.status === "rejected"
        ? "resubmitted"
        : null
  if (!nextStatus)
    return apiError(
      request,
      "INVALID_TRANSITION",
      "Task cannot accept evidence",
      409,
    )

  try {
    const evidence = await prisma.$transaction(async (tx) => {
      const latest = await tx.fulfillmentEvidence.findFirst({
        where: { taskId: task.id },
        orderBy: { version: "desc" },
        select: { version: true },
      })
      const changed = await tx.task.updateMany({
        where: { id: task.id, version: task.version, status: task.status },
        data: {
          status: nextStatus,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      })
      if (changed.count !== 1) throw new Error("VERSION_CONFLICT")
      const created = await tx.fulfillmentEvidence.create({
        data: {
          adoptionId: task.adoptionId!,
          taskId: task.id,
          submittedBy: villagerId,
          description: description.trim(),
          mediaJson: media as unknown as Prisma.InputJsonValue,
          version: (latest?.version ?? 0) + 1,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: villagerId,
          actorType: "villager",
          action:
            task.status === "rejected"
              ? "fulfillment.resubmit"
              : "fulfillment.submit_evidence",
          targetType: "fulfillment_evidence",
          targetId: created.id,
          adoptionId: task.adoptionId,
          correlationId: request.headers.get("x-correlation-id"),
          detail: {
            taskId: task.id,
            evidenceVersion: created.version,
            mediaCount: media.length,
          },
        },
      })
      return created
    })
    return jsonResponse(
      request,
      {
        data: {
          ...evidence,
          media: evidence.mediaJson,
          submittedAt: evidence.submittedAt.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return apiError(
        request,
        "VERSION_CONFLICT",
        "Task was updated by another request",
        409,
      )
    }
    throw error
  }
}

function parseMedia(value: unknown): FulfillmentMediaItem[] | null {
  if (!Array.isArray(value) || value.length > 8) return null
  const parsed: FulfillmentMediaItem[] = []
  for (const item of value) {
    if (
      !isPlainObject(item) ||
      typeof item.url !== "string" ||
      (!item.url.startsWith("/") && !item.url.startsWith("https://")) ||
      typeof item.hash !== "string" ||
      !/^[a-f0-9]{64}$/iu.test(item.hash) ||
      typeof item.mimeType !== "string" ||
      !allowedMimeTypes.has(item.mimeType) ||
      typeof item.size !== "number" ||
      !Number.isInteger(item.size) ||
      item.size < 1 ||
      item.size > 10 * 1024 * 1024
    )
      return null
    parsed.push(item as unknown as FulfillmentMediaItem)
  }
  return parsed
}
