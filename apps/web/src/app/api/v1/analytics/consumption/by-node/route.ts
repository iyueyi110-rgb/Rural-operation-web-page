import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  try {
    const grouped = await prisma.unifiedOrder.groupBy({
      by: ["nodeId"],
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
    })
    const nodeIds = grouped
      .map((item) => item.nodeId)
      .filter((nodeId): nodeId is string => typeof nodeId === "string")
    const nodes = await prisma.spaceNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, slug: true, nameKey: true, realm: true },
    })
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const data = grouped.map((item) => ({
      nodeId: item.nodeId,
      node: item.nodeId ? nodeMap.get(item.nodeId) ?? null : null,
      totalAmount: item._sum.totalAmount ?? 0,
      orderCount: item._count._all,
    }))

    return jsonResponse(request, {
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (error) {
    console.error("Consumption by node query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "数据库暂不可用，已返回降级演示数据" },
    })
  }
}
