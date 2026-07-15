import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { DEMO_NODES } from "@web/lib/renovation-demo-data"
import { getPublicRenovationNodes } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  try {
    const data = await getPublicRenovationNodes()
    if (data.length === 0) {
      return jsonResponse(request, {
        data: DEMO_NODES,
        meta: { degraded: true, demo: true, total: DEMO_NODES.length, reason: "后端暂无公示数据，返回演示数据" },
      })
    }
    return jsonResponse(request, { data, meta: { total: data.length } })
  } catch (error) {
    console.error("Public renovation query failed:", error)
    return jsonResponse(request, {
      data: DEMO_NODES,
      meta: { degraded: true, demo: true, total: DEMO_NODES.length, reason: "改造公示数据暂不可用，返回演示数据" },
    })
  }
}
