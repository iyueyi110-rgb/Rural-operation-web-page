import { prisma, type Prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"

function isDeviceReadingAuthorized(request: Request) {
  const expected = process.env.SENSOR_API_KEY
  if (!expected) return "demo" as const
  return request.headers.get("x-api-key") === expected ? "authorized" as const : "unauthorized" as const
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const authState = isDeviceReadingAuthorized(request)
  if (authState === "unauthorized") {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  const sourceRows = isPlainObject(body) && Array.isArray(body.readings) ? body.readings : [body]
  const rows = sourceRows.filter(isPlainObject).map((reading) => ({
    deviceId: typeof reading.deviceId === "string" ? reading.deviceId.trim() : "",
    type: typeof reading.type === "string" ? reading.type.trim() : "",
    value: Number(reading.value),
    unit: typeof reading.unit === "string" ? reading.unit.trim() : "",
    raw: reading,
  }))

  const validRows = rows.filter((reading) => reading.deviceId && reading.type && Number.isFinite(reading.value) && reading.unit)
  if (validRows.length === 0) {
    return jsonResponse(request, { error: "No valid device readings" }, { status: 400 })
  }

  const devices = await prisma.device.findMany({
    where: { deviceId: { in: validRows.map((reading) => reading.deviceId) } },
    select: { deviceId: true },
  })
  const deviceIds = new Set(devices.map((device) => device.deviceId))
  const missingDevice = validRows.find((reading) => !deviceIds.has(reading.deviceId))
  if (missingDevice && authState !== "demo") {
    return jsonResponse(request, { error: `Device ${missingDevice.deviceId} was not found` }, { status: 400 })
  }

  const now = new Date()
  const data = await prisma.$transaction(async (tx) => {
    const created = []
    for (const reading of validRows) {
      if (!deviceIds.has(reading.deviceId)) {
        await tx.device.create({
          data: {
            deviceId: reading.deviceId,
            name: `演示设备 ${reading.deviceId}`,
            type: reading.type,
            status: "active",
            lastSeenAt: now,
          },
        })
        deviceIds.add(reading.deviceId)
      }
      created.push(
        await tx.deviceReading.create({
          data: {
            deviceId: reading.deviceId,
            type: reading.type,
            value: reading.value,
            unit: reading.unit,
            raw: {
              ...(reading.raw as Record<string, unknown>),
              source: authState === "demo" ? "demo_simulated" : "iot_gateway",
            } as Prisma.InputJsonValue,
          },
        }),
      )
      await tx.device.update({
        where: { deviceId: reading.deviceId },
        data: { lastSeenAt: now, status: "active" },
      })
    }
    return created
  })

  return jsonResponse(
    request,
    {
      data,
      meta: {
        total: data.length,
        demoMode: authState === "demo",
        source: authState === "demo" ? "demo_simulated" : "iot_gateway",
      },
    },
    { status: 201 },
  )
}
