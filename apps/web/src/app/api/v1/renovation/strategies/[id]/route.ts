import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getRenovationStrategy } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getRenovationStrategy(params.id)
    if (!data) {
      return jsonResponse(request, { error: "Renovation strategy not found" }, { status: 404 })
    }

    return jsonResponse(request, { data })
  } catch (error) {
    console.error("Renovation strategy query failed:", error)
    return jsonResponse(request, {
      data: null,
      meta: { degraded: true, reason: "改造策略详情数据库暂不可用" },
    })
  }
}
