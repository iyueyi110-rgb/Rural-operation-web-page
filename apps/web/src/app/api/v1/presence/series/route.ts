import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const nodeId = url.searchParams.get("nodeId") ?? ""

  if (!nodeId) {
    return jsonResponse(
      request,
      { error: { code: "NODE_REQUIRED", message: "nodeId is required." } },
      { status: 400 },
    )
  }

  const node = await prisma.spaceNode.findUnique({ where: { id: nodeId } })

  if (!node) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_NODE", message: "Space node was not found." } },
      { status: 404 },
    )
  }

  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000)
  const timestamp: { gte?: Date; lte?: Date } = {}

  if (from) timestamp.gte = new Date(from)
  if (to) timestamp.lte = new Date(to)

  const data = await prisma.presenceLog.findMany({
    where: {
      nodeId,
      ...(timestamp.gte || timestamp.lte ? { timestamp } : {}),
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
}
