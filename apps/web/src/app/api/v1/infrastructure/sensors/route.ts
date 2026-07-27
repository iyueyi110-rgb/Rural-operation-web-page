import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { mapSensorReading } from "@web/lib/infrastructure-control"
import { isAdminRequest } from "@web/lib/tree-records"

function isSensorRequestAuthorized(request: Request) {
  const expected = process.env.SENSOR_API_KEY
  if (!expected) return false
  return request.headers.get("x-api-key") === expected
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isSensorRequestAuthorized(request) && !isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  const readings = isPlainObject(body) && Array.isArray(body.readings) ? body.readings : []

  const data = readings
    .filter(isPlainObject)
    .map((reading) => ({
      sensorId: typeof reading.sensorId === "string" ? reading.sensorId.trim() : "",
      type: typeof reading.type === "string" ? reading.type.trim() : "",
      value: Number(reading.value),
      unit: typeof reading.unit === "string" ? reading.unit.trim() : "",
      nodeId: typeof reading.nodeId === "string" && reading.nodeId.trim() ? reading.nodeId.trim() : null,
      source: typeof reading.source === "string" && reading.source.trim() ? reading.source.trim() : "iot_gateway",
    }))
    .filter((reading) => reading.sensorId && reading.type && Number.isFinite(reading.value) && reading.unit)

  if (data.length === 0) {
    return jsonResponse(request, { error: "No valid sensor readings" }, { status: 400 })
  }

  await prisma.sensorReading.createMany({ data })
  const created = await prisma.sensorReading.findMany({
    where: { sensorId: { in: data.map((reading) => reading.sensorId) } },
    orderBy: { createdAt: "desc" },
    take: data.length,
  })

  return jsonResponse(request, { data: created.map(mapSensorReading), meta: { total: data.length } }, { status: 201 })
}
