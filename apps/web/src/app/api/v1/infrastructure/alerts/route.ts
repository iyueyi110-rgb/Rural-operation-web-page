import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getLatestSensorReadings } from "@web/lib/infrastructure-control"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const sensors = await getLatestSensorReadings()
  const alerts = sensors.filter(
    (sensor) =>
      (sensor.type === "water_level" && sensor.value > 2.2) ||
      (sensor.type === "temperature" && sensor.value > 35),
  )
  return jsonResponse(request, { data: alerts, meta: { total: alerts.length } })
}
