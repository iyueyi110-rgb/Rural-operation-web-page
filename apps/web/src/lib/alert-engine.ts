import "server-only"

import { prisma } from "@zouma/database"
import type { AlertData, AlertType } from "@zouma/contracts"

import { getChinaDayRange } from "@web/lib/aigc-api"
import { getWeatherCondition } from "@web/lib/weather"
import { fetchWeatherAlerts } from "@web/lib/weather-alerts"
import { routeOptions } from "@web/lib/routes-data"

function mapAlert(record: {
  id: string
  alertType: string
  nodeId: string | null
  severity: string
  message: string
  status: string
  createdAt: Date
  resolvedAt: Date | null
}): AlertData {
  return {
    id: record.id,
    alertType: record.alertType as AlertType,
    nodeId: record.nodeId ?? undefined,
    severity: record.severity as AlertData["severity"],
    message: record.message,
    status: record.status as AlertData["status"],
    createdAt: record.createdAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString(),
  }
}

async function createAlertIfAbsent({
  alertType,
  nodeId,
  severity,
  message,
  dayStart,
}: {
  alertType: AlertType
  nodeId?: string
  severity: "high" | "medium" | "low"
  message: string
  dayStart: Date
}) {
  const existing = await prisma.alert.findFirst({
    where: {
      alertType,
      nodeId: nodeId ?? null,
      status: "active",
      createdAt: { gte: dayStart },
    },
  })

  if (existing) return existing

  return prisma.alert.create({
    data: {
      alertType,
      nodeId: nodeId ?? null,
      severity,
      message,
      status: "active",
    },
  })
}

export async function runAlertChecks(date: string): Promise<AlertData[]> {
  const { start, end } = getChinaDayRange(date)
  const [logs, nodes, weather, weatherAlerts] = await Promise.all([
    prisma.presenceLog.findMany({
      where: { timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.spaceNode.findMany(),
    getWeatherCondition(date),
    fetchWeatherAlerts(),
  ])
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const created = []

  for (const log of logs) {
    const node = nodeMap.get(log.nodeId)
    if (!node) continue

    const chinaHour = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      hour12: false,
    }).format(log.timestamp))

    if ((chinaHour >= 18 || chinaHour < 6) && log.peopleCount > 0) {
      created.push(
        await createAlertIfAbsent({
          alertType: "night_linger",
          nodeId: node.id,
          severity: "medium",
          message: `${node.slug} 夜间仍检测到 ${log.peopleCount} 人滞留，建议值班人员复核。`,
          dayStart: start,
        }),
      )
    }

    if (node.capacity > 0 && log.peopleCount / node.capacity > 0.8) {
      created.push(
        await createAlertIfAbsent({
          alertType: "crowd",
          nodeId: node.id,
          severity: "high",
          message: `${node.slug} 客流达到容量 ${Math.round((log.peopleCount / node.capacity) * 100)}%，建议分流。`,
          dayStart: start,
        }),
      )
    }

    if (node.watersideRisk > 0.3 && weather === "rainy" && log.peopleCount > 0) {
      created.push(
        await createAlertIfAbsent({
          alertType: "waterside",
          nodeId: node.id,
          severity: "high",
          message: `${node.slug} 雨天临水风险升高，建议增加边界提示。`,
          dayStart: start,
        }),
      )
    }
  }

  const routeOrders = routeOptions.map((route) => ({
    routeId: route.id,
    order: new Map(route.waypoints.map((waypoint, index) => [waypoint, index])),
  }))
  const logsByVisitor = new Map<string, typeof logs>()

  for (const log of logs) {
    if (!log.visitorId) continue
    const current = logsByVisitor.get(log.visitorId) ?? []
    current.push(log)
    logsByVisitor.set(log.visitorId, current)
  }

  for (const visitorLogs of logsByVisitor.values()) {
    const orderedLogs = visitorLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    for (let index = 1; index < orderedLogs.length; index += 1) {
      const previousNode = nodeMap.get(orderedLogs[index - 1].nodeId)
      const currentNode = nodeMap.get(orderedLogs[index].nodeId)
      if (!previousNode || !currentNode) continue

      const matchedRoute = routeOrders.find((route) => {
        const previousOrder = route.order.get(previousNode.nameKey)
        const currentOrder = route.order.get(currentNode.nameKey)
        return previousOrder !== undefined && currentOrder !== undefined && previousOrder - currentOrder > 3
      })

      if (!matchedRoute) continue

      created.push(
        await createAlertIfAbsent({
          alertType: "reverse_path",
          nodeId: currentNode.id,
          severity: "medium",
          message: `${currentNode.slug} 检测到疑似逆向穿行，关联路线 ${matchedRoute.routeId}，建议现场引导回到顺行游线。`,
          dayStart: start,
        }),
      )
    }
  }

  for (const warning of weatherAlerts) {
    created.push(
      await createAlertIfAbsent({
        alertType: warning.type,
        severity: warning.severity,
        message: `${warning.title}：${warning.text}`,
        dayStart: start,
      }),
    )
  }

  return created.map(mapAlert)
}

export async function runAnomalyDetection(date: string): Promise<AlertData[]> {
  const { start, end } = getChinaDayRange(date)
  const logs = await prisma.presenceLog.findMany({
    where: { timestamp: { gte: start, lte: end } },
    include: { node: true },
  })
  const hourlyByNode = new Map<string, Map<number, number>>()
  const created = []

  for (const log of logs) {
    const hour = getChinaHour(log.timestamp)
    const hours = hourlyByNode.get(log.nodeId) ?? new Map<number, number>()
    hours.set(hour, (hours.get(hour) ?? 0) + log.peopleCount)
    hourlyByNode.set(log.nodeId, hours)
  }

  for (const [nodeId, hours] of hourlyByNode) {
    const node = logs.find((log) => log.nodeId === nodeId)?.node
    if (!node) continue

    for (const [hour, count] of hours) {
      const historicalAvg = await getHistoricalAvg(nodeId, hour, start)
      if (historicalAvg > 0 && count > 10 && count > historicalAvg * 3) {
        created.push(
          await createAlertIfAbsent({
            alertType: "crowd",
            nodeId,
            severity: "high",
            message: `AI 异常检测：${node.slug} ${hour}:00 客流 ${count} 人，是同时间段均值 ${Math.round(historicalAvg)} 的 ${(count / historicalAvg).toFixed(1)} 倍。`,
            dayStart: start,
          }),
        )
      }
    }
  }

  return created.map(mapAlert)
}

export function toAlertData(record: Parameters<typeof mapAlert>[0]) {
  return mapAlert(record)
}

async function getHistoricalAvg(nodeId: string, hour: number, dateStart: Date) {
  const historyStart = new Date(dateStart)
  historyStart.setDate(historyStart.getDate() - 14)
  const logs = await prisma.presenceLog.findMany({
    where: {
      nodeId,
      timestamp: { gte: historyStart, lt: dateStart },
    },
    select: { timestamp: true, peopleCount: true },
  })
  const dailyTotals = new Map<string, number>()

  for (let index = 1; index <= 14; index += 1) {
    const day = new Date(dateStart)
    day.setDate(day.getDate() - index)
    dailyTotals.set(formatChinaDate(day), 0)
  }

  for (const log of logs) {
    if (getChinaHour(log.timestamp) !== hour) continue
    const day = formatChinaDate(log.timestamp)
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + log.peopleCount)
  }

  const totals = [...dailyTotals.values()]
  return totals.reduce((sum, value) => sum + value, 0) / totals.length
}

function getChinaHour(date: Date) {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hour12: false,
  }).format(date))
}

function formatChinaDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}
