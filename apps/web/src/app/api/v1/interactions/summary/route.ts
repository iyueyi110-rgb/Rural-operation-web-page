import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import {
  buildInteractionTaskGroups,
  summarizeInteractionProgress,
} from "@web/lib/interaction-dashboard-model"
import { maskPhone } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const adoptionId = searchParams.get("adoptionId")?.trim() ?? ""
  const adopterPhone = searchParams.get("adopterPhone")?.trim() ?? ""
  const periodKey = searchParams.get("periodKey")?.trim() ?? ""

  if (!adoptionId || !adopterPhone) {
    return jsonResponse(
      request,
      { error: "Missing interaction identity" },
      { status: 400 },
    )
  }

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

  const tasks = await prisma.visitorInteractionTask.findMany({
    where: { adoptionId: adoption.id, ...(periodKey ? { periodKey } : {}) },
    orderBy: { createdAt: "desc" },
  })
  const summary = summarizeInteractionProgress(
    buildInteractionTaskGroups(
      tasks.map((task) => ({
        ...task,
        description: task.description ?? undefined,
        periodKey: task.periodKey ?? undefined,
        seasonEventId: task.seasonEventId ?? undefined,
        completedAt: task.completedAt?.toISOString(),
        imageUrl: task.imageUrl ?? undefined,
        note: task.note ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    ),
  )

  return jsonResponse(request, { data: summary })
}
