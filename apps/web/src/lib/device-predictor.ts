import "server-only"

import { prisma } from "@zouma/database"

export interface DeviceIssuePrediction {
  message: string
  priority: "high" | "medium" | "low"
}

export async function predictDeviceIssues(): Promise<DeviceIssuePrediction[]> {
  const devices = await prisma.device.findMany({
    where: { status: "active" },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 20 } },
  })
  const warnings: DeviceIssuePrediction[] = []

  for (const device of devices) {
    const batteryReadings = device.readings.filter((reading) => reading.type === "battery")
    if (batteryReadings.length < 3) continue

    const latestThree = batteryReadings.slice(0, 3).map((reading) => reading.value)
    const isDeclining = latestThree[0] < latestThree[1] && latestThree[1] < latestThree[2]
    if (!isDeclining) continue

    const dropRate = (latestThree[2] - latestThree[0]) / 3
    if (!Number.isFinite(dropRate) || dropRate <= 0) continue

    const daysLeft = Math.floor(latestThree[0] / Math.abs(dropRate))
    if (!Number.isFinite(daysLeft) || daysLeft < 0 || daysLeft > 5) continue

    warnings.push({
      message: `设备 ${device.name}（${device.deviceId}）电池读数连续下降，预计 ${daysLeft} 天内离线，请安排巡检或更换电池。`,
      priority: daysLeft <= 1 ? "high" : daysLeft <= 3 ? "medium" : "low",
    })
  }

  return warnings
}
