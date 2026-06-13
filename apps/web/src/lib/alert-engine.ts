import "server-only"

import { prisma } from "@zouma/database"
import type { AlertData, AlertType } from "@zouma/contracts"

import { getChinaDayRange } from "@web/lib/aigc-api"
import { getWeatherCondition } from "@web/lib/weather"

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
  const [logs, nodes, weather] = await Promise.all([
    prisma.presenceLog.findMany({
      where: { timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.spaceNode.findMany(),
    getWeatherCondition(date),
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

  return created.map(mapAlert)
}

export function toAlertData(record: Parameters<typeof mapAlert>[0]) {
  return mapAlert(record)
}
