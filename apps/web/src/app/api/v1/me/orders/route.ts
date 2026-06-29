import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireBearerAuth } from "@web/lib/api-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const auth = await requireBearerAuth(request)
  if (!auth.authorized) return auth.response

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")?.trim()

  const [unifiedOrders, ticketOrders] = await Promise.all([
    prisma.unifiedOrder.findMany({
      where: {
        userId: auth.user.id,
        ...(type && type !== "ticket_order" ? { orderType: type } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    !type || type === "ticket_order"
      ? prisma.ticketOrder.findMany({
          where: { userId: auth.user.id },
          include: { product: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  const data = [
    ...unifiedOrders.map((order) => ({
      id: order.id,
      type: order.orderType,
      title: order.productName,
      status: order.status,
      amount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
    })),
    ...ticketOrders.map((order) => ({
      id: order.id,
      type: "ticket_order",
      title: order.product.name,
      status: order.status,
      amount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return jsonResponse(request, { data, meta: { total: data.length } })
}
