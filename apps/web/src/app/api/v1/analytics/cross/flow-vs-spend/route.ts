import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { computeFlowVsSpend } from "@web/lib/cross-analytics"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? getChinaDateString()
  const data = await computeFlowVsSpend(date)
  const insufficient = data.every((row) => row.peopleCount === 0 || row.orderCount === 0)
  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      degraded: insufficient,
      reason: insufficient ? "客流或消费样本不足，显示演示分析结构" : undefined,
    },
  })
}
