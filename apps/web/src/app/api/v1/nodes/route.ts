import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const data = await prisma.spaceNode.findMany({
    orderBy: [{ realm: "asc" }, { slug: "asc" }],
  })

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
    },
  })
}
