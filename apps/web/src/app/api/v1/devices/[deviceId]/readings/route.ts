import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { deviceId: string } }) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200)

  const data = await prisma.deviceReading.findMany({
    where: { deviceId: params.deviceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return jsonResponse(request, { data, meta: { total: data.length, limit } })
}
