import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireBearerAuth } from "@web/lib/api-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const auth = await requireBearerAuth(request)
  if (!auth.authorized) return auth.response

  const data = await prisma.treeAdoption.findMany({
    where: { adopterId: auth.user.id },
    include: { tree: true },
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, {
    data: data.map((adoption) => ({
      id: adoption.id,
      plan: adoption.plan,
      status: adoption.status,
      createdAt: adoption.createdAt.toISOString(),
      tree: {
        id: adoption.tree.id,
        treeCode: adoption.tree.treeCode,
        species: adoption.tree.species,
        healthStatus: adoption.tree.healthStatus,
        blurredLocation: adoption.tree.blurredLocation,
      },
    })),
    meta: { total: data.length },
  })
}
