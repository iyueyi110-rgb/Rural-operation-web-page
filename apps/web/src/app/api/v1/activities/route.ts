import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

function mapActivity(record: {
  id: string
  courtyardId: string
  activityType: string
  title: string
  description: string
  maxCapacity: number
  price: number | null
  scheduledDate: string
  scheduledTime: string
  status: string
  bookings?: Array<{ guestCount: number; status: string }>
}) {
  const bookedCount =
    record.bookings?.filter((booking) => booking.status === "confirmed").reduce((sum, booking) => sum + booking.guestCount, 0) ?? 0

  return {
    id: record.id,
    courtyardId: record.courtyardId,
    activityType: record.activityType,
    title: record.title,
    description: record.description,
    maxCapacity: record.maxCapacity,
    price: record.price ?? undefined,
    scheduledDate: record.scheduledDate,
    scheduledTime: record.scheduledTime,
    status: bookedCount >= record.maxCapacity && record.status === "open" ? "full" : record.status,
    bookedCount,
  }
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courtyardId = searchParams.get("courtyardId") ?? undefined
  const date = searchParams.get("date") ?? undefined
  const activityType = searchParams.get("activityType") ?? undefined

  const data = await prisma.courtyardActivity.findMany({
    where: {
      ...(courtyardId ? { courtyardId } : {}),
      ...(date ? { scheduledDate: date } : {}),
      ...(activityType ? { activityType } : {}),
    },
    include: { bookings: true },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  })

  return jsonResponse(request, { data: data.map(mapActivity), meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const courtyardId = typeof body.courtyardId === "string" ? body.courtyardId.trim() : ""
  const activityType = typeof body.activityType === "string" ? body.activityType.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const maxCapacity = Number(body.maxCapacity)
  const price = body.price == null || body.price === "" ? null : Number(body.price)
  const scheduledDate = typeof body.scheduledDate === "string" ? body.scheduledDate.trim() : ""
  const scheduledTime = typeof body.scheduledTime === "string" ? body.scheduledTime.trim() : ""

  if (!courtyardId || !activityType || !title || !description || !Number.isInteger(maxCapacity) || maxCapacity < 1 || !scheduledDate || !scheduledTime) {
    return jsonResponse(request, { error: "Missing activity fields" }, { status: 400 })
  }

  const record = await prisma.courtyardActivity.create({
    data: {
      courtyardId,
      activityType,
      title,
      description,
      maxCapacity,
      price: Number.isFinite(price) ? price : null,
      scheduledDate,
      scheduledTime,
      status: "open",
    },
    include: { bookings: true },
  })

  return jsonResponse(request, { data: mapActivity(record) }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Missing activity id" }, { status: 400 })
  }

  const record = await prisma.courtyardActivity.update({
    where: { id: body.id },
    data: {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      maxCapacity: Number.isInteger(Number(body.maxCapacity)) ? Number(body.maxCapacity) : undefined,
      price: body.price == null || body.price === "" ? undefined : Number(body.price),
      scheduledDate: typeof body.scheduledDate === "string" ? body.scheduledDate.trim() : undefined,
      scheduledTime: typeof body.scheduledTime === "string" ? body.scheduledTime.trim() : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    },
    include: { bookings: true },
  })

  return jsonResponse(request, { data: mapActivity(record) })
}
