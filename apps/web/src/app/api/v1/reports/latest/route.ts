import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const data = await prisma.dailyReport.findFirst({
    orderBy: { date: "desc" },
  })

  return jsonResponse(request, { data })
}
