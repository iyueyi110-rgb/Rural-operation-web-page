import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { demoApiAssessments } from "@web/lib/renovation-api-demo-data"
import { listBuildingAssessments } from "@web/lib/renovation-service"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50

  try {
    const data = await listBuildingAssessments(limit)
    if (data.length === 0) {
      const demoData = demoApiAssessments().slice(0, limit)
      return jsonResponse(request, {
        data: demoData,
        meta: { degraded: true, demo: true, total: demoData.length, reason: "后端暂无建筑评估记录，返回演示数据" },
      })
    }
    return jsonResponse(request, { data, meta: { total: data.length } })
  } catch (error) {
    console.error("Building assessments query failed:", error)
    const data = demoApiAssessments().slice(0, limit)
    return jsonResponse(request, {
      data,
      meta: { degraded: true, demo: true, total: data.length, reason: "建筑评估数据库暂不可用，返回演示数据" },
    })
  }
}
