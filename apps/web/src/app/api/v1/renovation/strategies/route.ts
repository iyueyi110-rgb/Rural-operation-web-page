import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { listRenovationStrategies } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50

  try {
    const data = await listRenovationStrategies(limit)
    return jsonResponse(request, { data, meta: { total: data.length } })
  } catch (error) {
    console.error("Renovation strategies query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "改造策略数据库暂不可用" },
    })
  }
}
