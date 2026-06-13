import { prisma } from "@zouma/database"

import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { computeNodeDailyScores } from "@web/lib/node-scoring"

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const url = new URL(request.url)
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30) || 30, 1), 90)
  const node = await prisma.spaceNode.findUnique({ where: { slug: params.slug } })

  if (!node) {
    return jsonResponse(
      request,
      { error: { code: "NODE_NOT_FOUND", message: "Space node was not found." } },
      { status: 404 },
    )
  }

  const today = getChinaDateString()
  await computeNodeDailyScores(today)

  const from = getChinaDateString(addDays(new Date(`${today}T00:00:00+08:00`), -(days - 1)))
  const data = await prisma.nodeDailyScore.findMany({
    where: {
      nodeId: node.id,
      date: { gte: from, lte: today },
    },
    orderBy: { date: "desc" },
  })

  return jsonResponse(request, {
    data,
    node,
    meta: {
      total: data.length,
      from,
      to: today,
      days,
    },
  })
}
