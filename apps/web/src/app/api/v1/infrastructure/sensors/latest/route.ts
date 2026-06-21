import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { resolveSensorHealthStatus } from "@web/lib/device-heartbeat"
import { getLatestSensorReadings } from "@web/lib/infrastructure-control"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const nodeId =
    new URL(request.url).searchParams.get("nodeId")?.trim() || undefined
  const [data, device] = await Promise.all([
    getLatestSensorReadings(nodeId),
    nodeId
      ? prisma.device.findFirst({
          where: { nodeId },
          select: { status: true },
          orderBy: { updatedAt: "desc" },
        })
      : null,
  ])
  const newestReadingAt = data.reduce(
    (latest, reading) => Math.max(latest, Date.parse(reading.createdAt)),
    0,
  )
  const status = resolveSensorHealthStatus(device?.status, newestReadingAt)

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      status,
      source: status === "active" ? "lora" : "seasonal_baseline",
    },
  })
}
