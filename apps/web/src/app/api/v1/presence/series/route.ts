import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  if (!from || !to) {
    return jsonResponse(request, {
      data: [{ timestamp: new Date().toISOString(), peopleCount: 0 }],
      meta: { degraded: true, reason: "缺少时间范围参数，已返回演示数据" },
    })
  }

  const nodeId = url.searchParams.get("nodeId") ?? ""

  if (!nodeId) {
    return jsonResponse(
      request,
      { error: { code: "NODE_REQUIRED", message: "nodeId is required." } },
      { status: 400 },
    )
  }

  try {
    const node = await prisma.spaceNode.findUnique({ where: { id: nodeId } })

    if (!node) {
      return jsonResponse(
        request,
        { error: { code: "INVALID_NODE", message: "Space node was not found." } },
        { status: 404 },
      )
    }

    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000)
    const timestamp: { gte?: Date; lte?: Date } = {}

    timestamp.gte = new Date(from)
    timestamp.lte = new Date(to)

    const data = await prisma.presenceLog.findMany({
      where: {
        nodeId,
        timestamp,
      },
      orderBy: { timestamp: "asc" },
      take: limit,
    })

    return jsonResponse(request, {
      data,
      node,
      meta: {
        total: data.length,
        limit,
      },
    })
  } catch (error) {
    console.error("Presence series query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "数据库暂不可用" },
    })
  }
}
