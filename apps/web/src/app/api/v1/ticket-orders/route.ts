import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { quantityOptions, ticketDateOptions, ticketProducts } from "@web/lib/tickets-data"

interface TicketOrderRequest {
  productId?: string
  date?: string
  quantity?: number
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

  const createdAt = new Date().toISOString()

  return jsonResponse(request, {
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
