import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isTaskStatus, mapTask } from "@web/lib/task-records"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import {
  isFulfillmentTaskAction,
  transitionFulfillmentTask,
} from "@web/lib/fulfillment-workflow"
import { WorkflowConflictError } from "@web/lib/workflow-errors"

const villagerTaskStatuses = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
] as const

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const villagerId = await getVillagerIdFromToken(request)
  if (!villagerId) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const status = new URL(request.url).searchParams.get("status")
  if (status && !isVillagerTaskStatus(status)) {
    return jsonResponse(
      request,
      { error: "Invalid task status" },
      { status: 400 },
    )
  }

  const data = await prisma.task.findMany({
    where: { villagerId, ...(status ? { status } : {}) },
    include: {
      villager: { select: { id: true, name: true } },
      node: { select: { id: true, slug: true, nameKey: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, {
    data: data.map(mapTask),
    meta: { total: data.length },
  })
}

export async function PATCH(request: Request) {
  const villagerId = await getVillagerIdFromToken(request)
  if (!villagerId) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(
      request,
      { error: "Invalid task update" },
      { status: 400 },
    )
  }

  const existing = await prisma.task.findFirst({
    where: { id: body.id.trim(), villagerId },
  })
  if (!existing) {
    return jsonResponse(request, { error: "Task not found" }, { status: 404 })
  }
  if (existing.adoptionId && isFeatureEnabled("ADOPTION_V2_ENABLED")) {
    if (
      !isFulfillmentTaskAction(body.action) ||
      !["accept", "start", "report_exception"].includes(body.action) ||
      !Number.isInteger(body.expectedVersion)
    ) {
      return jsonResponse(
        request,
        { error: "Invalid fulfillment action" },
        { status: 400 },
      )
    }
    try {
      const updated = await transitionFulfillmentTask({
        taskId: existing.id,
        action: body.action,
        expectedVersion: body.expectedVersion as number,
        actorId: villagerId,
        actorType: "villager",
        reason:
          typeof body.reason === "string" ? body.reason.trim() : undefined,
        correlationId: request.headers.get("x-correlation-id") ?? undefined,
      })
      const data = await prisma.task.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          villager: { select: { id: true, name: true } },
          node: { select: { id: true, slug: true, nameKey: true } },
        },
      })
      return jsonResponse(request, { data: mapTask(data) })
    } catch (error) {
      if (error instanceof WorkflowConflictError) {
        return jsonResponse(
          request,
          { error: error.message, code: error.code },
          { status: 409 },
        )
      }
      throw error
    }
  }

  if (
    !isVillagerTaskStatus(body.status) ||
    !canVillagerMoveTask(existing.status, body.status)
  ) {
    return jsonResponse(
      request,
      { error: "Invalid task status transition" },
      { status: 400 },
    )
  }

  const data = await prisma.task.update({
    where: { id: existing.id },
    data: { status: body.status },
    include: {
      villager: { select: { id: true, name: true } },
      node: { select: { id: true, slug: true, nameKey: true } },
    },
  })
  return jsonResponse(request, { data: mapTask(data) })
}

function isVillagerTaskStatus(
  value: unknown,
): value is (typeof villagerTaskStatuses)[number] {
  return (
    isTaskStatus(value) &&
    villagerTaskStatuses.includes(
      value as (typeof villagerTaskStatuses)[number],
    )
  )
}

function canVillagerMoveTask(current: string, next: string) {
  const transitions: Record<string, string> = {
    pending: "accepted",
    accepted: "in_progress",
    in_progress: "completed",
  }
  return current === next || transitions[current] === next
}
