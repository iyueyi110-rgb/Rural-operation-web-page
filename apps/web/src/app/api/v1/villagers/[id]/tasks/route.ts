import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { mapTask, summarizeTasks } from "@web/lib/task-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
