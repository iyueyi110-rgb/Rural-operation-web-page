import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

const activityTypes = ["planting", "pruning", "fertilizing", "harvesting", "processing", "festival"] as const
const statuses = ["upcoming", "active", "completed"] as const

type FarmingStatus = (typeof statuses)[number]

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const data = await prisma.farmingCalendar.findMany({
    where: {
      ...(isStatus(status) ? { status } : {}),
      ...(from || to
        ? {
            startDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  })

  return jsonResponse(request, { data, meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid farming calendar payload" }, { status: 400 })
  }

  const parsed = parseCreatePayload(body)
  if (!parsed) {
    return jsonResponse(request, { error: "Farming calendar payload is invalid" }, { status: 400 })
  }

  const data = await prisma.farmingCalendar.create({ data: parsed })
  return jsonResponse(request, { data }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid farming calendar update" }, { status: 400 })
  }

  const parsed = parseUpdatePayload(body)
  if (!parsed) {
    return jsonResponse(request, { error: "Farming calendar update is invalid" }, { status: 400 })
  }

  const data = await prisma.farmingCalendar.update({
    where: { id: body.id },
    data: parsed,
  })

  return jsonResponse(request, { data })
}

function parseCreatePayload(payload: Record<string, unknown>) {
  const solarTerm = typeof payload.solarTerm === "string" ? payload.solarTerm.trim() : ""
  const title = typeof payload.title === "string" ? payload.title.trim() : ""
  const description = typeof payload.description === "string" ? payload.description.trim() : ""
  const activityType = typeof payload.activityType === "string" ? payload.activityType.trim() : ""
  const startDate = typeof payload.startDate === "string" ? payload.startDate.trim() : ""
  const status = isStatus(payload.status) ? payload.status : "upcoming"

  if (!solarTerm || !title || !description || !isActivityType(activityType) || !isDateString(startDate)) {
    return null
  }

  return {
    solarTerm,
    title,
    description,
    activityType,
    startDate,
    ...(typeof payload.endDate === "string" ? { endDate: payload.endDate.trim() || null } : {}),
    ...(typeof payload.treeSpecies === "string" ? { treeSpecies: payload.treeSpecies.trim() || null } : {}),
    status,
  }
}

function parseUpdatePayload(payload: Record<string, unknown>) {
  const solarTerm = typeof payload.solarTerm === "string" ? payload.solarTerm.trim() : ""
  const title = typeof payload.title === "string" ? payload.title.trim() : ""
  const description = typeof payload.description === "string" ? payload.description.trim() : ""
  const activityType = typeof payload.activityType === "string" ? payload.activityType.trim() : ""
  const startDate = typeof payload.startDate === "string" ? payload.startDate.trim() : ""

  if (startDate && !isDateString(startDate)) return null
  if (activityType && !isActivityType(activityType)) return null

  return {
    ...(solarTerm ? { solarTerm } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(activityType ? { activityType } : {}),
    ...(startDate ? { startDate } : {}),
    ...(typeof payload.endDate === "string" ? { endDate: payload.endDate.trim() || null } : {}),
    ...(typeof payload.treeSpecies === "string" ? { treeSpecies: payload.treeSpecies.trim() || null } : {}),
    ...(isStatus(payload.status) ? { status: payload.status } : {}),
  }
}

function isStatus(value: unknown): value is FarmingStatus {
  return typeof value === "string" && statuses.includes(value as FarmingStatus)
}

function isActivityType(value: unknown): value is (typeof activityTypes)[number] {
  return typeof value === "string" && activityTypes.includes(value as (typeof activityTypes)[number])
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
