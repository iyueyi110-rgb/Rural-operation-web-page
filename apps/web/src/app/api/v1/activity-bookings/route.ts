import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { maskPhone } from "@web/lib/tree-records"

function mapBooking(record: {
  id: string
  activityId: string
  guestName: string
  guestPhone: string
  guestCount: number
  status: string
  createdAt: Date
}) {
  return {
    id: record.id,
    activityId: record.activityId,
    guestName: record.guestName,
    guestPhone: record.guestPhone,
    guestCount: record.guestCount,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  }
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const activityId = searchParams.get("activityId") ?? undefined
  const data = await prisma.activityBooking.findMany({
    where: activityId ? { activityId } : undefined,
    orderBy: { createdAt: "desc" },
  })
  return jsonResponse(request, { data: data.map(mapBooking), meta: { total: data.length } })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const activityId = typeof body.activityId === "string" ? body.activityId.trim() : ""
  const guestName = typeof body.guestName === "string" ? body.guestName.trim() : ""
  const guestPhone = typeof body.guestPhone === "string" ? body.guestPhone.trim() : ""
  const guestCount = Number(body.guestCount)

  if (!activityId || !guestName || !guestPhone || !Number.isInteger(guestCount) || guestCount < 1) {
    return jsonResponse(request, { error: "Missing activity booking fields" }, { status: 400 })
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const activity = await tx.courtyardActivity.findUnique({ where: { id: activityId } })
      if (!activity || activity.status !== "open") throw new Error("UNAVAILABLE")

      const booked = await tx.activityBooking.aggregate({
        where: { activityId, status: "confirmed" },
        _sum: { guestCount: true },
      })
      if ((booked._sum.guestCount ?? 0) + guestCount > activity.maxCapacity) throw new Error("FULL")

      return tx.activityBooking.create({
        data: {
          activityId,
          guestName,
          guestPhone: maskPhone(guestPhone) ?? "",
          guestCount,
          status: "confirmed",
        },
      })
    })

    return jsonResponse(request, { data: mapBooking(record) }, { status: 201 })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "BOOKING_FAILED"
    const status = message === "FULL" ? 409 : message === "UNAVAILABLE" ? 400 : 500
    return jsonResponse(request, { error: message }, { status })
  }
}
