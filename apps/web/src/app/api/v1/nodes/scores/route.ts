import { prisma } from "@zouma/database"

import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { computeNodeDailyScores } from "@web/lib/node-scoring"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const date = url.searchParams.get("date") ?? getChinaDateString()

  await computeNodeDailyScores(date)

  const data = await prisma.nodeDailyScore.findMany({
    where: { date },
    include: { node: true },
    orderBy: { attractiveness: "desc" },
  })

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      date,
    },
  })
}
