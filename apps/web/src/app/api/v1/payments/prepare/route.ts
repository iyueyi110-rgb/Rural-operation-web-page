import { randomUUID } from "node:crypto"

import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireUserSession } from "@web/lib/api-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid payment payload" }, { status: 400 })
  }

  const orderType = typeof body.orderType === "string" ? body.orderType.trim() : ""
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : ""
  const amount = Number(body.amount)
  const channel = typeof body.channel === "string" && body.channel.trim()
    ? body.channel.trim()
    : "mock_demo"

  if (!orderType || !orderId || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(request, { error: "orderType, orderId and amount are required" }, { status: 400 })
  }

  const user = await requireUserSession(request)
  const data = await prisma.paymentOrder.create({
    data: {
      orderType,
      orderId,
      userId: user?.id ?? null,
      amount,
      channel,
      status: "pending",
      idempotentKey: randomUUID(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1_000),
    },
  })

  return jsonResponse(
    request,
    {
      data: {
        paymentOrderId: data.id,
        idempotentKey: data.idempotentKey,
        status: data.status,
        qrCodePlaceholder: true,
        demoMode: true,
        hint: "演示模式：点击确认支付即可完成",
      },
      meta: { demoMode: true },
    },
    { status: 201 },
  )
}
