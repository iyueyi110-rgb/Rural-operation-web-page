import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const now = new Date()
  const events = await prisma.seasonEvent.findMany({
    where: {
      status: "active",
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { endDate: "asc" },
  })

  return jsonResponse(request, {
    data: events.map((event) => ({
      id: event.id,
      solarTerm: event.solarTerm,
      title: event.title,
      description: event.description ?? undefined,
      taskType: event.taskType,
      bonusPoints: event.bonusPoints,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      imageUrl: event.imageUrl ?? undefined,
      status: event.status,
    })),
    meta: { total: events.length },
  })
}
