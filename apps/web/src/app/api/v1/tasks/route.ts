import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"
import { canMoveTaskStatus, isTaskStatus, isTaskType, mapTask } from "@web/lib/task-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskType = searchParams.get("taskType")
  const status = searchParams.get("status")
  const villagerId = searchParams.get("villagerId")

  try {
    const data = await prisma.task.findMany({
      where: {
        ...(isTaskType(taskType) ? { taskType } : {}),
        ...(isTaskStatus(status) ? { status } : {}),
        ...(villagerId ? { villagerId } : {}),
      },
      include: {
        villager: { select: { id: true, name: true } },
        node: { select: { id: true, slug: true, nameKey: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return jsonResponse(request, { data: data.map(mapTask), meta: { total: data.length } })
  } catch (error) {
    console.error("Tasks query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "数据库暂不可用，已返回降级演示数据" },
    })
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid task payload" }, { status: 400 })
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""
  const taskType = isTaskType(body.taskType) ? body.taskType : undefined
  const villagerId = typeof body.villagerId === "string" && body.villagerId.trim() ? body.villagerId.trim() : null
  const nodeId = typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null
  const earnings = typeof body.earnings === "number" ? body.earnings : Number(body.earnings ?? 0)

  if (!title || !taskType || !Number.isFinite(earnings) || earnings < 0) {
    return jsonResponse(request, { error: "title, taskType and earnings are required" }, { status: 400 })
  }

  if (villagerId) {
    const villager = await prisma.villager.findUnique({ where: { id: villagerId }, select: { id: true } })
    if (!villager) return jsonResponse(request, { error: "Villager was not found" }, { status: 400 })
  }

  if (nodeId) {
    const node = await prisma.spaceNode.findUnique({ where: { id: nodeId }, select: { id: true } })
    if (!node) return jsonResponse(request, { error: "Space node was not found" }, { status: 400 })
  }

  const data = await prisma.task.create({
    data: {
      title,
      taskType,
      description: typeof body.description === "string" ? body.description.trim() : null,
      villagerId,
      nodeId,
      scheduledDate: typeof body.scheduledDate === "string" ? body.scheduledDate.trim() : null,
      earnings,
      status: "pending",
    },
    include: {
      villager: { select: { id: true, name: true } },
      node: { select: { id: true, slug: true, nameKey: true } },
    },
  })

  if (data.villagerId) {
    void notifyVillagerTaskAssignment(data).catch((error) =>
      console.error("Failed to create task notification:", error),
    )
  }

  return jsonResponse(request, { data: mapTask(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid task update" }, { status: 400 })
  }

  const existing = await prisma.task.findUnique({ where: { id: body.id } })
  if (!existing) {
    return jsonResponse(request, { error: "Task was not found" }, { status: 404 })
  }

  const nextStatus = isTaskStatus(body.status) ? body.status : existing.status
  if (!canMoveTaskStatus(existing.status, nextStatus)) {
    return jsonResponse(request, { error: "Invalid task status transition" }, { status: 400 })
  }

  const earnings = typeof body.earnings === "number" ? body.earnings : Number(body.earnings ?? existing.earnings)
  if (!Number.isFinite(earnings) || earnings < 0) {
    return jsonResponse(request, { error: "Invalid task earnings" }, { status: 400 })
  }

  const data = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
      ...(isTaskType(body.taskType) ? { taskType: body.taskType } : {}),
      ...(typeof body.villagerId === "string" ? { villagerId: body.villagerId.trim() || null } : {}),
      ...(typeof body.nodeId === "string" ? { nodeId: body.nodeId.trim() || null } : {}),
      ...(typeof body.scheduledDate === "string" ? { scheduledDate: body.scheduledDate.trim() || null } : {}),
      earnings,
      status: nextStatus,
    },
    include: {
      villager: { select: { id: true, name: true } },
      node: { select: { id: true, slug: true, nameKey: true } },
    },
  })

  if (data.villagerId && data.villagerId !== existing.villagerId) {
    void notifyVillagerTaskAssignment(data).catch((error) =>
      console.error("Failed to create reassignment notification:", error),
    )
  }

  return jsonResponse(request, { data: mapTask(data) })
}

async function notifyVillagerTaskAssignment(task: {
  id: string
  title: string
  description: string | null
  villagerId: string | null
}) {
  if (!task.villagerId) return
  const existing = await prisma.notification.findFirst({
    where: {
      recipientType: "villager",
      recipientId: task.villagerId,
      refType: "task",
      refId: task.id,
    },
    select: { id: true },
  })
  if (existing) return

  await prisma.notification.create({
    data: {
      recipientType: "villager",
      recipientId: task.villagerId,
      title: `📋 新任务：${task.title}`,
      body: task.description?.slice(0, 200) ?? "",
      category: "task",
      refType: "task",
      refId: task.id,
    },
  })
}
