import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireUserSession } from "@web/lib/api-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(request.url)
  const payment = await prisma.paymentOrder.findUnique({
    where: { id: params.id },
  })
  if (!payment) {
    return jsonResponse(request, { error: "Payment order not found" }, { status: 404 })
  }

  const user = await requireUserSession(request)
  const idempotentKey = searchParams.get("idempotentKey")
  const canRead =
    !payment.userId ||
    payment.userId === user?.id ||
    (!!idempotentKey && idempotentKey === payment.idempotentKey)

  if (!canRead) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  return jsonResponse(request, {
    data: {
      id: payment.id,
      orderType: payment.orderType,
      orderId: payment.orderId,
      amount: payment.amount,
      channel: payment.channel,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      demoMode: payment.channel === "mock_demo",
    },
  })
}
