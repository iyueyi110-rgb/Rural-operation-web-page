import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireUserSession } from "@web/lib/api-auth"
import { resolvePaidOrderUpdate } from "@web/lib/payment-status"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.paymentOrderId !== "string") {
    return jsonResponse(request, { error: "paymentOrderId is required" }, { status: 400 })
  }

  const user = await requireUserSession(request)
  const paymentOrderId = body.paymentOrderId.trim()
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.paymentOrder.findUnique({ where: { id: paymentOrderId } })
    if (!payment) return null

    if (payment.status !== "paid") {
      await tx.paymentOrder.update({
        where: { id: payment.id },
        data: { status: "paid", paidAt: now },
      })

      const update = resolvePaidOrderUpdate(payment.orderType)
      if (update?.model === "treeAdoption") {
        const adoption = await tx.treeAdoption.update({
          where: { id: payment.orderId },
          data: { status: update.status },
          select: { treeId: true },
        })
        await tx.orchardTree.update({
          where: { id: adoption.treeId },
          data: { adoptStatus: "reserved" },
        })
      } else if (update?.model === "ticketOrder") {
        await tx.ticketOrder.update({
          where: { id: payment.orderId },
          data: { status: update.status },
        })
      } else if (update?.model === "unifiedOrder") {
        await tx.unifiedOrder.update({
          where: { id: payment.orderId },
          data: { status: update.status },
        })
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: user?.id ?? payment.userId ?? "anonymous",
        action: "payment_callback",
        targetType: "payment_order",
        targetId: payment.id,
        detail: {
          demoMode: true,
          orderType: payment.orderType,
          orderId: payment.orderId,
          amount: payment.amount,
        },
        ipAddress: request.headers.get("x-forwarded-for") ?? null,
      },
    })

    return tx.paymentOrder.findUnique({ where: { id: payment.id } })
  })

  if (!result) {
    return jsonResponse(request, { error: "Payment order not found" }, { status: 404 })
  }

  return jsonResponse(request, {
    data: {
      success: true,
      paymentOrderId: result.id,
      status: result.status,
      paidAt: result.paidAt?.toISOString() ?? null,
      demoMode: true,
    },
    meta: { demoMode: true },
  })
}
