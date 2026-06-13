import { prisma } from "@zouma/database"

import { getChinaDayRange, isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"

const orderTypes = ["courtyard_booking", "tree_adoption", "ticket_order", "activity_booking"] as const

function isOrderType(value: unknown): value is (typeof orderTypes)[number] {
  return typeof value === "string" && orderTypes.includes(value as (typeof orderTypes)[number])
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderType = url.searchParams.get("orderType") ?? ""
  const nodeId = url.searchParams.get("nodeId") ?? ""
  const date = url.searchParams.get("date") ?? ""
  const where: {
    orderType?: string
    nodeId?: string
    createdAt?: { gte: Date; lte: Date }
  } = {}

  if (orderType && isOrderType(orderType)) {
    where.orderType = orderType
  }

  if (nodeId) {
    where.nodeId = nodeId
  }

  if (date) {
    const { start, end } = getChinaDayRange(date)
    where.createdAt = { gte: start, lte: end }
  }

  const data = await prisma.unifiedOrder.findMany({
    where,
    include: { node: true },
    orderBy: { createdAt: "desc" },
  })
  const totalAmount = data.reduce((sum, order) => sum + order.totalAmount, 0)

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      totalAmount,
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || !isOrderType(body.orderType)) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_ORDER_TYPE", message: "Order type is invalid." } },
      { status: 400 },
    )
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : ""
  const productName = typeof body.productName === "string" ? body.productName.trim() : ""
  const quantity = Number(body.quantity ?? 1)
  const totalAmount = Number(body.totalAmount ?? 0)
  const nodeId = typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null

  if (
    !productId ||
    !productName ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_ORDER", message: "Order payload is invalid." } },
      { status: 400 },
    )
  }

  if (nodeId) {
    const node = await prisma.spaceNode.findUnique({ where: { id: nodeId } })

    if (!node) {
      return jsonResponse(
        request,
        { error: { code: "INVALID_NODE", message: "Space node was not found." } },
        { status: 400 },
      )
    }
  }

  const data = await prisma.unifiedOrder.create({
    data: {
      orderType: body.orderType,
      productId,
      productName,
      quantity,
      totalAmount,
      status: typeof body.status === "string" ? body.status : "pending_payment",
      nodeId,
      metadata: isPlainObject(body.metadata) ? body.metadata : undefined,
    },
    include: { node: true },
  })

  return jsonResponse(request, { data }, { status: 201 })
}
