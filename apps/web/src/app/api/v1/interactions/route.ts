import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import {
  getInteractionPoints,
  getInteractionRepeatCount,
  isInteractionTaskType,
} from "@web/lib/interaction-tasks"
import { awardAdoptionPoints } from "@web/lib/points-service"
import { maskPhone } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const adoptionId = searchParams.get("adoptionId")?.trim() ?? ""
  const adopterPhone = searchParams.get("adopterPhone")?.trim() ?? ""
  const status = searchParams.get("status")
  const periodKey = searchParams.get("periodKey")?.trim() ?? ""

  if (
    !adoptionId ||
    !adopterPhone ||
    (status && !isInteractionStatus(status))
  ) {
    return jsonResponse(
      request,
      { error: "Invalid interaction query" },
      { status: 400 },
    )
  }
  const adoption = await findOwnedActiveAdoption(adoptionId, adopterPhone)
  if (!adoption) {
    return jsonResponse(
      request,
      { error: "Active adoption not found" },
      { status: 404 },
    )
  }

  const data = await prisma.visitorInteractionTask.findMany({
    where: {
      adoptionId: adoption.id,
      ...(status ? { status } : {}),
      ...(periodKey ? { periodKey } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  return jsonResponse(request, {
    data: data.map(mapInteraction),
    meta: { total: data.length },
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid interaction payload" },
      { status: 400 },
    )
  }

  const adoptionId =
    typeof body.adoptionId === "string" ? body.adoptionId.trim() : ""
  const treeId = typeof body.treeId === "string" ? body.treeId.trim() : ""
  const adopterPhone =
    typeof body.adopterPhone === "string" ? body.adopterPhone.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const taskType = isInteractionTaskType(body.taskType) ? body.taskType : null
  if (!adoptionId || !treeId || !adopterPhone || !title || !taskType) {
    return jsonResponse(
      request,
      { error: "Missing required interaction fields" },
      { status: 400 },
    )
  }

  const adoption = await findOwnedActiveAdoption(adoptionId, adopterPhone)
  if (!adoption || adoption.treeId !== treeId) {
    return jsonResponse(
      request,
      { error: "Active adoption not found" },
      { status: 404 },
    )
  }

  const data = await prisma.visitorInteractionTask.create({
    data: {
      adoptionId,
      treeId,
      taskType,
      title,
      description:
        typeof body.description === "string"
          ? body.description.trim() || null
          : null,
      periodKey:
        typeof body.periodKey === "string"
          ? body.periodKey.trim() || null
          : null,
      maxCompletions:
        typeof body.maxCompletions === "number"
          ? Math.max(1, Math.floor(body.maxCompletions))
          : getInteractionRepeatCount(taskType),
      pointsPerCompletion: getInteractionPoints(taskType),
    },
  })
  return jsonResponse(request, { data: mapInteraction(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (
    !isPlainObject(body) ||
    typeof body.id !== "string" ||
    typeof body.adopterPhone !== "string" ||
    body.status !== "completed"
  ) {
    return jsonResponse(
      request,
      { error: "Invalid interaction update" },
      { status: 400 },
    )
  }

  const existing = await prisma.visitorInteractionTask.findUnique({
    where: { id: body.id.trim() },
    include: { adoption: true },
  })
  if (
    !existing ||
    existing.status === "expired" ||
    (existing.status === "completed" &&
      existing.completionCount >= existing.maxCompletions) ||
    existing.adoption.status !== "active" ||
    existing.adoption.adopterPhone !== maskPhone(body.adopterPhone.trim())
  ) {
    return jsonResponse(
      request,
      { error: "Pending interaction not found" },
      { status: 404 },
    )
  }
  if (!isInteractionTaskType(existing.taskType)) {
    return jsonResponse(
      request,
      { error: "Invalid interaction type" },
      { status: 400 },
    )
  }

  const pointsPerCompletion =
    existing.pointsPerCompletion > 0
      ? existing.pointsPerCompletion
      : getInteractionPoints(existing.taskType)
  const nextCompletionCount = Math.min(
    existing.maxCompletions,
    existing.completionCount + 1,
  )
  const isComplete = nextCompletionCount >= existing.maxCompletions
  const data = await prisma.$transaction(async (tx) => {
    const updated = await tx.visitorInteractionTask.update({
      where: { id: existing.id },
      data: {
        status: isComplete ? "completed" : "pending",
        completedAt: isComplete ? new Date() : existing.completedAt,
        completionCount: nextCompletionCount,
        pointsPerCompletion,
        totalPointsEarned: { increment: pointsPerCompletion },
        points: { increment: pointsPerCompletion },
        note:
          typeof body.note === "string"
            ? body.note.trim() || null
            : existing.note,
        imageUrl:
          typeof body.imageUrl === "string"
            ? body.imageUrl.trim() || null
            : existing.imageUrl,
      },
    })
    await awardAdoptionPoints({
      adoptionId: existing.adoptionId,
      amount: pointsPerCompletion,
      source: existing.taskType,
      referenceId: existing.id,
      note: updated.title,
      client: tx,
    })
    return updated
  })
  return jsonResponse(request, { data: mapInteraction(data) })
}

function isInteractionStatus(value: string) {
  return ["pending", "completed", "expired"].includes(value)
}

function findOwnedActiveAdoption(adoptionId: string, adopterPhone: string) {
  return prisma.treeAdoption.findFirst({
    where: {
      id: adoptionId,
      adopterPhone: maskPhone(adopterPhone),
      status: "active",
    },
    select: { id: true, treeId: true },
  })
}

function mapInteraction(task: {
  id: string
  adoptionId: string
  treeId: string
  taskType: string
  title: string
  description: string | null
  status: string
  periodKey: string | null
  maxCompletions: number
  completionCount: number
  pointsPerCompletion: number
  totalPointsEarned: number
  seasonEventId: string | null
  completedAt: Date | null
  imageUrl: string | null
  note: string | null
  points: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...task,
    description: task.description ?? undefined,
    periodKey: task.periodKey ?? undefined,
    seasonEventId: task.seasonEventId ?? undefined,
    completedAt: task.completedAt?.toISOString(),
    imageUrl: task.imageUrl ?? undefined,
    note: task.note ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}
