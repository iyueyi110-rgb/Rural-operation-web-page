import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { paginationMeta, parsePaginationParams } from "@web/lib/pagination"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const params = parsePaginationParams(searchParams)
  const realm = searchParams.get("realm")?.trim()
  const nodeType = searchParams.get("nodeType")?.trim()
  const where = {
    ...(realm ? { realm } : {}),
    ...(nodeType ? { nodeType } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.spaceNode.findMany({
      where,
      orderBy: [{ realm: "asc" }, { slug: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
    prisma.spaceNode.count({ where }),
  ])

  return jsonResponse(request, {
    data,
    meta: paginationMeta(total, params),
  })
}
