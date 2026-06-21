import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isValidRecommendationDate } from "@web/lib/recommendation-generator"

const statuses = ["draft", "approved", "rejected", "executed"] as const
const types = [
  "weather_plan",
  "crowd_diversion",
  "inventory_alert",
  "maintenance",
] as const

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bizDate = searchParams.get("bizDate")?.trim() || undefined
  const status = searchParams.get("status")?.trim() || undefined
  const type = searchParams.get("type")?.trim() || undefined

  if (bizDate && !isValidRecommendationDate(bizDate)) {
    return jsonResponse(request, { error: "Invalid bizDate" }, { status: 400 })
  }
  if (status && !statuses.includes(status as (typeof statuses)[number])) {
    return jsonResponse(
      request,
      { error: "Invalid recommendation status" },
      { status: 400 },
    )
  }
  if (type && !types.includes(type as (typeof types)[number])) {
    return jsonResponse(
      request,
      { error: "Invalid recommendation type" },
      { status: 400 },
    )
  }

  const data = await prisma.recommendation.findMany({
    where: {
      ...(bizDate ? { bizDate } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return jsonResponse(request, { data, meta: { total: data.length } })
}
