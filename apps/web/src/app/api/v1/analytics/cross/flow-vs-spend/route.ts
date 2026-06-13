import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { computeFlowVsSpend } from "@web/lib/cross-analytics"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? getChinaDateString()
  const data = await computeFlowVsSpend(date)
  return jsonResponse(request, { data, meta: { total: data.length } })
}
