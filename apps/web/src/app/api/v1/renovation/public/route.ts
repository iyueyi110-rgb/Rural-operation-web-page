import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getPublicRenovationNodes } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  try {
    const data = await getPublicRenovationNodes()
    return jsonResponse(request, { data, meta: { total: data.length } })
  } catch (error) {
    console.error("Public renovation query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "改造公示数据暂不可用" },
    })
  }
}
