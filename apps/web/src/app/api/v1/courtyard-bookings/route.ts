import { NextResponse } from "next/server"

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

export async function POST(request: Request) {
  let body: CourtyardBookingRequest

  try {
    body = (await request.json()) as CourtyardBookingRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const courtyard = courtyardOptions.find((option) => option.id === body.courtyardId)
  const dateOption = bookingDateOptions.find((option) => option.value === body.date)
  const paymentMode = paymentModeOptions.find((option) => option.value === body.paymentMode)

  if (!courtyard || !dateOption || !paymentMode || typeof body.guestCount !== "number") {
    return NextResponse.json({ error: "Missing or invalid booking fields" }, { status: 400 })
  }

  if (body.guestCount < 1 || body.guestCount > courtyard.capacity) {
    return NextResponse.json({ error: "Guest count exceeds courtyard capacity" }, { status: 400 })
  }

  if (courtyard.inventoryStatus === "maintenance" || dateOption.status === "booked") {
    return NextResponse.json({ error: "Courtyard is not available for this date" }, { status: 409 })
  }

  const createdAt = new Date().toISOString()

  return NextResponse.json({
    data: {
      id: `CB-${Date.now()}`,
      status: "pending_payment",
      createdAt,
    },
  })
}
