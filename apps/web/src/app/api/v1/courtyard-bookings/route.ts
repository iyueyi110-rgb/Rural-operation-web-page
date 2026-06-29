import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireUserSession } from "@web/lib/api-auth"
import {
  bookingDateOptions,
  courtyardOptions,
  paymentModeOptions,
  type PaymentMode,
} from "@web/lib/courtyards-data"

interface CourtyardBookingRequest {
  courtyardId?: string
  date?: string
  guestCount?: number
  paymentMode?: PaymentMode
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  let body: CourtyardBookingRequest

  try {
    body = (await request.json()) as CourtyardBookingRequest
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const courtyard = courtyardOptions.find((option) => option.id === body.courtyardId)
  const dateOption = bookingDateOptions.find((option) => option.value === body.date)
  const paymentMode = paymentModeOptions.find((option) => option.value === body.paymentMode)

  if (!courtyard || !dateOption || !paymentMode || typeof body.guestCount !== "number") {
    return jsonResponse(request, { error: "Missing or invalid booking fields" }, { status: 400 })
  }

  if (body.guestCount < 1 || body.guestCount > courtyard.capacity) {
    return jsonResponse(request, { error: "Guest count exceeds courtyard capacity" }, { status: 400 })
  }

  if (courtyard.inventoryStatus === "maintenance" || dateOption.status === "booked") {
    return jsonResponse(request, { error: "Courtyard is not available for this date" }, { status: 409 })
  }

  const user = await requireUserSession(request)
  const dbCourtyard = await prisma.courtyard.findUnique({
    where: { id: courtyard.id },
  })
  if (!dbCourtyard) {
    return jsonResponse(request, { error: "Courtyard is not available in database" }, { status: 404 })
  }
  const totalAmount = paymentMode.value === "deposit" ? 240 : 680
  const record = await prisma.unifiedOrder.create({
    data: {
      orderType: "courtyard_booking",
      productId: dbCourtyard.id,
      productName: dbCourtyard.name,
      quantity: 1,
      totalAmount,
      userId: user?.id ?? null,
      status: "pending_payment",
      metadata: {
        date: dateOption.value,
        guestCount: body.guestCount,
        paymentMode: paymentMode.value,
        demoMode: true,
      },
    },
  })

  return jsonResponse(request, {
    data: {
      id: record.id,
      status: record.status,
      orderType: record.orderType,
      amount: record.totalAmount,
      createdAt: record.createdAt.toISOString(),
    },
  }, { status: 201 })
}
