import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireVillagerOrAdmin } from "@web/lib/api-auth"
import { mapTask, summarizeTasks } from "@web/lib/task-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = requireVillagerOrAdmin(request, params.id)
  if (!auth.authorized) return auth.response

  const data = await prisma.task.findMany({
    where: { villagerId: params.id },
    include: {
      villager: { select: { id: true, name: true } },
      node: { select: { id: true, slug: true, nameKey: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, {
    data: data.map(mapTask),
    meta: { total: data.length, summary: summarizeTasks(data) },
  })
}
