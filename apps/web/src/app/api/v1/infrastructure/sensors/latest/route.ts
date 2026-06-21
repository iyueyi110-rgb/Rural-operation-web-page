import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getLatestSensorReadings } from "@web/lib/infrastructure-control"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const nodeId = new URL(request.url).searchParams.get("nodeId")?.trim() || undefined
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
  const status =
    device?.status === "inactive"
      ? "inactive"
      : data.length === 0 || newestReadingAt < Date.now() - 30 * 60 * 1000
        ? "warning"
        : "active"

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      status,
      source: status === "active" ? "lora" : "seasonal_baseline",
    },
  })
}
