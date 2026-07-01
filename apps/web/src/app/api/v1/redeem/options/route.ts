import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const options = await prisma.redemptionOption.findMany({
    where: { status: "active" },
    orderBy: { pointsCost: "asc" },
  })

  return jsonResponse(request, {
    data: options.map((option) => ({
      id: option.id,
      title: option.title,
      description: option.description ?? undefined,
      pointsCost: option.pointsCost,
      type: option.type,
      stock: option.stock,
      redeemedCount: option.redeemedCount,
      imageUrl: option.imageUrl ?? undefined,
      status: option.status,
    })),
    meta: { total: options.length },
  })
}
