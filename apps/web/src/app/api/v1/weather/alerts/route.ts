import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { fetchWeatherAlerts } from "@web/lib/weather-alerts"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const data = await fetchWeatherAlerts()
  return jsonResponse(request, { data, meta: { total: data.length } })
}
