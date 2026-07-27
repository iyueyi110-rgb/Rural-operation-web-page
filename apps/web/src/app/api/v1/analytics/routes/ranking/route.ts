import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(Number(searchParams.get("days") ?? 30) || 30, 180)
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [routeGroups, providerGroups] = await Promise.all([
    prisma.routeGenerationLog.groupBy({
      by: ["routeId"],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
      orderBy: { _count: { routeId: "desc" } },
    }),
    prisma.routeGenerationLog.groupBy({
      by: ["routeId", "provider"],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
    }),
  ])

  const providersByRoute = new Map<string, Record<string, number>>()
  for (const item of providerGroups) {
    const current = providersByRoute.get(item.routeId) ?? {}
    current[item.provider] = item._count._all
    providersByRoute.set(item.routeId, current)
  }

  const data = routeGroups.map((item) => ({
    routeId: item.routeId,
    generationCount: item._count._all,
    providers: providersByRoute.get(item.routeId) ?? {},
  }))

  return jsonResponse(request, { data, meta: { total: data.length, days } })
}
