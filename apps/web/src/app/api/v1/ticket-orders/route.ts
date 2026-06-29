import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireUserSession } from "@web/lib/api-auth"
import { quantityOptions, ticketDateOptions, ticketProducts } from "@web/lib/tickets-data"

interface TicketOrderRequest {
  productId?: string
  date?: string
  quantity?: number
  guestPhone?: string
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  let body: TicketOrderRequest

  try {
    body = (await request.json()) as TicketOrderRequest
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const product = ticketProducts.find((option) => option.id === body.productId)
  const dateOption = ticketDateOptions.find((option) => option.value === body.date)

  if (!product || !dateOption || typeof body.quantity !== "number") {
    return jsonResponse(request, { error: "Missing or invalid ticket order fields" }, { status: 400 })
  }

  if (!quantityOptions.includes(body.quantity as (typeof quantityOptions)[number])) {
    return jsonResponse(request, { error: "Ticket quantity is out of range" }, { status: 400 })
  }

  const user = await requireUserSession(request)
  const dbProduct = await prisma.ticketProduct.findUnique({
    where: { id: product.id },
  })
  if (!dbProduct) {
    return jsonResponse(request, { error: "Ticket product is not available in database" }, { status: 404 })
  }
  const quantity = body.quantity
  const record = await prisma.ticketOrder.create({
    data: {
      productId: dbProduct.id,
      userId: user?.id ?? null,
      quantity,
      totalAmount: dbProduct.price * quantity,
      guestPhone:
        user?.mobile ??
        (typeof body.guestPhone === "string" ? body.guestPhone.trim() : null),
      status: "pending_payment",
    },
  })

  return jsonResponse(request, {
    data: {
      id: record.id,
      status: record.status,
      orderType: "ticket_order",
      productId: record.productId,
      date: dateOption.value,
      quantity: record.quantity,
      amount: record.totalAmount,
      createdAt: record.createdAt.toISOString(),
    },
  }, { status: 201 })
}
