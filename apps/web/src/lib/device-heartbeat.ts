import { prisma } from "@zouma/database"

export const OFFLINE_THRESHOLD_MS = 90 * 60 * 1000
export const SENSOR_STALE_THRESHOLD_MS = 30 * 60 * 1000

export function isDeviceHeartbeatExpired(
  lastSeenAt: Date | null,
  now = new Date(),
) {
  return (
    lastSeenAt === null ||
    lastSeenAt.getTime() < now.getTime() - OFFLINE_THRESHOLD_MS
  )
}

export function buildDeviceOfflineAlertMessage(device: {
  name: string
  deviceId: string
}) {
  return `${device.name} (${device.deviceId}) offline for >1.5 hours.`
}

export function resolveSensorHealthStatus(
  deviceStatus: string | null | undefined,
  newestReadingAt: number,
  now = Date.now(),
) {
  if (deviceStatus === "inactive" || deviceStatus === "offline") {
    return "inactive" as const
  }
  if (
    deviceStatus === "warning" ||
    newestReadingAt === 0 ||
    newestReadingAt < now - SENSOR_STALE_THRESHOLD_MS
  ) {
    return "warning" as const
  }
  return "active" as const
}

export async function checkDeviceHeartbeatSafely<
  T = Awaited<ReturnType<typeof runDeviceHeartbeatCheck>>,
>(
  check: () => Promise<T> = runDeviceHeartbeatCheck as () => Promise<T>,
  onError: (error: unknown) => void = (error) =>
    console.error("Heartbeat check failed:", error),
) {
  try {
    return await check()
  } catch (error) {
    onError(error)
    return null
  }
}

export async function runDeviceHeartbeatCheck(now = new Date()) {
  const threshold = new Date(now.getTime() - OFFLINE_THRESHOLD_MS)
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const dayStart = new Date(`${day}T00:00:00+08:00`)
  const dayEnd = new Date(`${day}T23:59:59.999+08:00`)
  const offlineDevices = await prisma.device.findMany({
    where: {
      status: "active",
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: threshold } }],
    },
    orderBy: { lastSeenAt: "asc" },
  })
  let alertCreatedCount = 0

  for (const device of offlineDevices) {
    const message = buildDeviceOfflineAlertMessage(device)
    const existingAlert = await prisma.alert.findFirst({
      where: {
        alertType: "device_offline",
        nodeId: device.nodeId ?? null,
        status: "active",
        createdAt: { gte: dayStart, lte: dayEnd },
        message: { contains: `(${device.deviceId})` },
      },
      select: { id: true },
    })

    if (!existingAlert) {
      const alert = await prisma.alert.create({
        data: {
          alertType: "device_offline",
          nodeId: device.nodeId ?? null,
          severity: "medium",
          message,
          status: "active",
        },
      })
      void prisma.notification
        .create({
          data: {
            recipientType: "operator",
            recipientId: "all",
            title: "🟡 设备离线告警",
            body: message,
            category: "alert",
            refType: "alert",
            refId: alert.id,
          },
        })
        .catch((error) =>
          console.error("Failed to create device alert notification:", error),
        )
      alertCreatedCount += 1
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { status: "warning" },
    })
  }

  return {
    checkedAt: now.toISOString(),
    offlineDevices,
    alertCreatedCount,
  }
}
