import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { summarizeTasks } from "@web/lib/task-records"
import { isAdminRequest } from "@web/lib/tree-records"

const skillOptions = ["cooking", "farming", "guiding", "handicraft", "logistics"] as const
const statusOptions = ["active", "inactive"] as const

type VillagerSkill = (typeof skillOptions)[number]
type VillagerStatus = (typeof statusOptions)[number]

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const nodeId = searchParams.get("nodeId")

  const data = await prisma.villager.findMany({
    where: {
      ...(isVillagerStatus(status) ? { status } : {}),
      ...(nodeId ? { nodeId } : {}),
    },
    include: { node: true, tasks: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  return jsonResponse(request, {
    data: data.map(mapVillager),
    meta: { total: data.length },
  })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid villager payload" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const skills = parseSkills(body.skills)
  const nodeId = typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null
  const status = isVillagerStatus(body.status) ? body.status : "active"

  if (!name || !phone || skills.length === 0) {
    return jsonResponse(request, { error: "name, phone and skills are required" }, { status: 400 })
  }

  if (nodeId) {
    const node = await prisma.spaceNode.findUnique({ where: { id: nodeId }, select: { id: true } })
    if (!node) {
      return jsonResponse(request, { error: "Space node was not found" }, { status: 400 })
    }
  }

  const data = await prisma.villager.create({
    data: { name, phone, skills, nodeId, status },
    include: { node: true, tasks: true },
  })

  return jsonResponse(request, { data: mapVillager(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid villager update" }, { status: 400 })
  }

  const nodeId = typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null
  if (nodeId) {
    const node = await prisma.spaceNode.findUnique({ where: { id: nodeId }, select: { id: true } })
    if (!node) {
      return jsonResponse(request, { error: "Space node was not found" }, { status: 400 })
    }
  }

  const data = await prisma.villager.update({
    where: { id: body.id },
    data: {
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.phone === "string" ? { phone: body.phone.trim() } : {}),
      ...(Array.isArray(body.skills) ? { skills: parseSkills(body.skills) } : {}),
      ...(typeof body.nodeId === "string" ? { nodeId } : {}),
      ...(isVillagerStatus(body.status) ? { status: body.status } : {}),
    },
    include: { node: true, tasks: true },
  })

  return jsonResponse(request, { data: mapVillager(data) })
}

function isVillagerStatus(value: unknown): value is VillagerStatus {
  return typeof value === "string" && statusOptions.includes(value as VillagerStatus)
}

function parseSkills(value: unknown): VillagerSkill[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is VillagerSkill => typeof item === "string" && skillOptions.includes(item as VillagerSkill))))
}

function readSkills(value: unknown): VillagerSkill[] {
  return parseSkills(value)
}

function mapVillager(villager: {
  id: string
  name: string
  phone: string
  skills: unknown
  nodeId: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  node?: { id: string; slug: string; nameKey: string } | null
  tasks?: Array<{ status: string; earnings: number }>
}) {
  return {
    ...villager,
    nodeId: villager.nodeId ?? undefined,
    skills: readSkills(villager.skills),
    createdAt: villager.createdAt.toISOString(),
    updatedAt: villager.updatedAt.toISOString(),
    taskSummary: summarizeTasks(villager.tasks ?? []),
  }
}
