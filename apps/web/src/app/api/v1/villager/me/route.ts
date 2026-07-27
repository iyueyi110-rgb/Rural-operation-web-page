import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { summarizeTasks } from "@web/lib/task-records"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const villagerId = await getVillagerIdFromToken(request)
  if (!villagerId) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const villager = await prisma.villager.findUnique({
    where: { id: villagerId },
    include: {
      node: { select: { id: true, slug: true, nameKey: true } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!villager || villager.status !== "active") {
    return jsonResponse(
      request,
      { error: "Villager not found" },
      { status: 404 },
    )
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  return jsonResponse(request, {
    data: {
      id: villager.id,
      name: villager.name,
      skills: villager.skills,
      nodeId: villager.nodeId,
      node: villager.node,
      status: villager.status,
      taskSummary: summarizeTasks(villager.tasks),
      monthlyTaskSummary: summarizeTasks(
        villager.tasks.filter((task) => task.updatedAt >= monthStart),
      ),
    },
  })
}
