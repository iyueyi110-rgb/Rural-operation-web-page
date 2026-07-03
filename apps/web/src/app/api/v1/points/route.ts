import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getOrCreateAdoptionPoints } from "@web/lib/points-service"
import { maskPhone } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const adoptionId = searchParams.get("adoptionId")?.trim() ?? ""
  const adopterPhone = searchParams.get("adopterPhone")?.trim() ?? ""
  const includeTransactions = searchParams.get("include") === "transactions"

  if (!adopterPhone) {
    return jsonResponse(request, {
      data: { totalPoints: 0, records: [] },
      meta: { degraded: true, reason: "缺少 adopterPhone 参数，已返回演示数据" },
    })
  }

  if (!adoptionId) {
    return jsonResponse(
      request,
      { error: "Missing adoption identity" },
      { status: 400 },
    )
  }

  try {
    const adoption = await prisma.treeAdoption.findFirst({
      where: {
        id: adoptionId,
        adopterPhone: maskPhone(adopterPhone),
        status: "active",
      },
      select: { id: true },
    })
    if (!adoption) {
      return jsonResponse(
        request,
        { error: "Active adoption not found" },
        { status: 404 },
      )
    }

    const account = await getOrCreateAdoptionPoints(adoption.id)
    const transactions = includeTransactions
      ? await prisma.pointsTransaction.findMany({
          where: { adoptionPointsId: account.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : []

    return jsonResponse(request, {
      data: {
        adoptionId: adoption.id,
        totalPoints: account.totalPoints,
        availablePoints: account.availablePoints,
        redeemedPoints: account.redeemedPoints,
      },
      ...(includeTransactions
        ? {
            transactions: transactions.map((transaction) => ({
              id: transaction.id,
              amount: transaction.amount,
              type: transaction.type,
              source: transaction.source,
              referenceId: transaction.referenceId ?? undefined,
              note: transaction.note ?? undefined,
              createdAt: transaction.createdAt.toISOString(),
            })),
          }
        : {}),
    })
  } catch (error) {
    console.error("Points query failed:", error)
    return jsonResponse(request, {
      data: { totalPoints: 0, records: [] },
      meta: { degraded: true, total: 0, reason: "数据库暂不可用，已返回降级演示数据" },
    })
  }
}
