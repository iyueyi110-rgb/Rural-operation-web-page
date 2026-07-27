import "server-only"

import { prisma } from "@zouma/database"

import { getChinaDayRange } from "@web/lib/aigc-api"

export interface CrossAnalyticsRow {
  nodeId: string
  nodeName: string
  peopleCount: number
  revenue: number
  orderCount: number
  conversionRate: number | null
  roi: number | null
  note?: string
}

export async function computeFlowVsSpend(date: string): Promise<CrossAnalyticsRow[]> {
  const { start, end } = getChinaDayRange(date)
  const nodes = await prisma.spaceNode.findMany()

  const [presenceGroups, orderGroups] = await Promise.all([
    prisma.presenceLog.groupBy({
      by: ["nodeId"],
      where: { timestamp: { gte: start, lte: end } },
      _sum: { peopleCount: true },
    }),
    prisma.unifiedOrder.groupBy({
      by: ["nodeId"],
      where: { createdAt: { gte: start, lte: end }, nodeId: { not: null } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ])

  const peopleByNode = new Map(presenceGroups.map((item) => [item.nodeId, item._sum.peopleCount ?? 0]))
  const spendByNode = new Map(orderGroups.map((item) => [item.nodeId, item]))

  return nodes
    .map((node) => {
      const peopleCount = peopleByNode.get(node.id) ?? 0
      const spend = spendByNode.get(node.id)
      const revenue = spend?._sum.totalAmount ?? 0
      const orderCount = spend?._count._all ?? 0

      return {
        nodeId: node.id,
        nodeName: node.slug,
        peopleCount,
        revenue,
        orderCount,
        conversionRate: peopleCount === 0 ? null : orderCount / peopleCount,
        roi: peopleCount === 0 ? null : revenue / peopleCount,
        note: peopleCount === 0 ? "no_visitor_data" : undefined,
      }
    })
    .sort((a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1))
}
