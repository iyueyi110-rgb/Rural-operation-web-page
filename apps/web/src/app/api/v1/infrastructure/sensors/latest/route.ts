import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getLatestSensorReadings } from "@web/lib/infrastructure-control"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const data = await getLatestSensorReadings()
  return jsonResponse(request, { data, meta: { total: data.length } })
}
