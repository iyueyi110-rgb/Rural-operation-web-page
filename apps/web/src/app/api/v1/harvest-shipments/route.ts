import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest, mapHarvestShipment } from "@web/lib/tree-records"

const shipmentStatuses = ["pending", "picking", "shipping", "delivered"] as const
const allowedTransitions: Record<(typeof shipmentStatuses)[number], Array<(typeof shipmentStatuses)[number]>> = {
  pending: ["picking"],
  picking: ["shipping"],
  shipping: ["delivered"],
  delivered: [],
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const harvestBookingId = searchParams.get("harvestBookingId") ?? undefined
  const isAdmin = isAdminRequest(request)

  const records = await prisma.harvestShipment.findMany({
    where: harvestBookingId ? { harvestBookingId } : undefined,
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, {
    data: records.map((record) => mapHarvestShipment(record, { maskPrivateFields: !isAdmin })),
    meta: { total: records.length },
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown

  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const harvestBookingId = typeof body.harvestBookingId === "string" ? body.harvestBookingId.trim() : ""
  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : ""
  const recipientPhone = typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : ""
  const recipientAddress = typeof body.recipientAddress === "string" ? body.recipientAddress.trim() : ""

  if (!harvestBookingId || !recipientName || !recipientPhone || !recipientAddress) {
    return jsonResponse(request, { error: "Missing harvest shipment fields" }, { status: 400 })
  }

  const booking = await prisma.harvestBooking.findUnique({ where: { id: harvestBookingId } })
  if (!booking) {
    return jsonResponse(request, { error: "Harvest booking not found" }, { status: 404 })
  }

  const existing = await prisma.harvestShipment.findUnique({ where: { harvestBookingId } })
  if (existing) {
    return jsonResponse(request, { error: "Harvest shipment already exists" }, { status: 409 })
  }

  const record = await prisma.harvestShipment.create({
    data: {
      harvestBookingId,
      recipientName,
      recipientPhone,
      recipientAddress,
      status: "pending",
    },
  })

  return jsonResponse(request, { data: mapHarvestShipment(record) }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Missing harvest shipment update fields" }, { status: 400 })
  }

  const record = await prisma.harvestShipment.findUnique({ where: { id: body.id } })
  if (!record) {
    return jsonResponse(request, { error: "Harvest shipment not found" }, { status: 404 })
  }

  const nextStatus = typeof body.status === "string" ? body.status : record.status
  if (!shipmentStatuses.includes(nextStatus as (typeof shipmentStatuses)[number])) {
    return jsonResponse(request, { error: "Invalid harvest shipment status" }, { status: 400 })
  }

  if (nextStatus !== record.status) {
    const allowedNext = allowedTransitions[record.status as (typeof shipmentStatuses)[number]] ?? []
    if (!allowedNext.includes(nextStatus as (typeof shipmentStatuses)[number])) {
      return jsonResponse(request, { error: "Invalid harvest shipment status transition" }, { status: 400 })
    }
  }

  const courier = typeof body.courier === "string" ? body.courier.trim() : record.courier
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : record.trackingNumber
  if (nextStatus === "shipping" && (!courier || !trackingNumber)) {
    return jsonResponse(request, { error: "Courier and tracking number are required for shipping" }, { status: 400 })
  }

  const updated = await prisma.harvestShipment.update({
    where: { id: record.id },
    data: {
      recipientName: typeof body.recipientName === "string" ? body.recipientName.trim() : undefined,
      recipientPhone: typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : undefined,
      recipientAddress: typeof body.recipientAddress === "string" ? body.recipientAddress.trim() : undefined,
      courier: courier || undefined,
      trackingNumber: trackingNumber || undefined,
      status: nextStatus,
      shippedAt: nextStatus === "shipping" && !record.shippedAt ? new Date() : undefined,
      deliveredAt: nextStatus === "delivered" && !record.deliveredAt ? new Date() : undefined,
    },
  })

  return jsonResponse(request, { data: mapHarvestShipment(updated, { maskPrivateFields: false }) })
}
