import { NextResponse } from "next/server"

import { quantityOptions, ticketDateOptions, ticketProducts } from "@web/lib/tickets-data"

interface TicketOrderRequest {
  productId?: string
  date?: string
  quantity?: number
}

export async function POST(request: Request) {
  let body: TicketOrderRequest

  try {
    body = (await request.json()) as TicketOrderRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const product = ticketProducts.find((option) => option.id === body.productId)
  const dateOption = ticketDateOptions.find((option) => option.value === body.date)

  if (!product || !dateOption || typeof body.quantity !== "number") {
    return NextResponse.json({ error: "Missing or invalid ticket order fields" }, { status: 400 })
  }

  if (!quantityOptions.includes(body.quantity as (typeof quantityOptions)[number])) {
    return NextResponse.json({ error: "Ticket quantity is out of range" }, { status: 400 })
  }

  const createdAt = new Date().toISOString()

  return NextResponse.json({
    data: {
      id: `TK-${Date.now()}`,
      status: "pending_payment",
      productId: product.id,
      date: dateOption.value,
      quantity: body.quantity,
      createdAt,
    },
  })
}
