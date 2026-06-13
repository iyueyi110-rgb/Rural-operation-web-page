import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest, mapHarvestBooking, maskPhone } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const treeId = searchParams.get("treeId") ?? undefined
  const records = await prisma.harvestBooking.findMany({
    where: treeId ? { treeId } : undefined,
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, { data: records.map(mapHarvestBooking), meta: { total: records.length } })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown

  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const treeCode = typeof body.treeId === "string" ? body.treeId : ""
  const scheduledDate = typeof body.date === "string" ? body.date : typeof body.scheduledDate === "string" ? body.scheduledDate : ""
  const timeSlot = typeof body.timeSlot === "string" ? body.timeSlot : ""
  const guestCount = typeof body.guestCount === "number" ? body.guestCount : Number(body.guestCount)

  if (!treeCode || !scheduledDate || !timeSlot || !Number.isInteger(guestCount) || guestCount < 1) {
    return jsonResponse(request, { error: "Missing or invalid harvest booking fields" }, { status: 400 })
  }

  const tree = await prisma.orchardTree.findFirst({
    where: { OR: [{ id: treeCode }, { treeCode }] },
  })

  if (!tree) {
    return jsonResponse(request, { error: "Tree not found" }, { status: 404 })
  }

  const existing = await prisma.harvestBooking.findFirst({
    where: {
      treeId: tree.id,
      scheduledDate,
      timeSlot,
      status: { in: ["pending", "confirmed"] },
    },
  })

  if (existing) {
    return jsonResponse(request, { error: "Harvest slot already booked" }, { status: 409 })
  }

  const record = await prisma.harvestBooking.create({
    data: {
      treeId: tree.id,
      scheduledDate,
      timeSlot,
      guestCount,
      guestName: typeof body.guestName === "string" ? body.guestName.trim() : null,
      guestPhone: maskPhone(typeof body.guestPhone === "string" ? body.guestPhone : undefined),
      status: "pending",
    },
  })

  return jsonResponse(request, { data: mapHarvestBooking(record) }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string" || typeof body.status !== "string") {
    return jsonResponse(request, { error: "Missing harvest booking update fields" }, { status: 400 })
  }

  if (!["pending", "confirmed", "completed", "cancelled"].includes(body.status)) {
    return jsonResponse(request, { error: "Invalid harvest booking status" }, { status: 400 })
  }

  const record = await prisma.harvestBooking.update({
    where: { id: body.id },
    data: { status: body.status },
  })

  return jsonResponse(request, { data: mapHarvestBooking(record) })
}
