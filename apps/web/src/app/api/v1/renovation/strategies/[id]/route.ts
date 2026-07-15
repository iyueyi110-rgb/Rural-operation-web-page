import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { demoApiStrategyDetail } from "@web/lib/renovation-api-demo-data"
import { getRenovationStrategy } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getRenovationStrategy(params.id)
    if (!data) {
      return jsonResponse(request, {
        data: demoApiStrategyDetail(params.id),
        meta: { degraded: true, demo: true, reason: "未找到改造策略，返回演示详情" },
      })
    }

    return jsonResponse(request, { data })
  } catch (error) {
    console.error("Renovation strategy query failed:", error)
    return jsonResponse(request, {
      data: demoApiStrategyDetail(params.id),
      meta: { degraded: true, demo: true, reason: "改造策略详情数据库暂不可用，返回演示详情" },
    })
  }
}
