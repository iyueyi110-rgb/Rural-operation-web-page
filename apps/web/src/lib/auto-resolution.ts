import "server-only"

import { prisma } from "@zouma/database"

import { fetchWeatherAlerts } from "@web/lib/weather-alerts"

const weatherAlertTypes = ["rainstorm", "heat", "wind", "typhoon", "flood_risk", "fire_risk", "snowstorm", "other"]

interface ReportActionItem {
  priority?: string
  action?: string
  status?: string
  closedAt?: string
  closeReason?: string
}

export async function runAutoResolution(_date: string): Promise<number> {
  const activeAlerts = await prisma.alert.findMany({
    where: { status: "active" },
  })
  const activeWeatherAlerts = await fetchWeatherAlerts()
  let resolved = 0

  for (const alert of activeAlerts) {
    if (alert.alertType === "night_linger" && alert.severity !== "high") {
      if (getChinaHour() >= 6) {
        await resolveAlert(alert.id, "次日清晨自动关闭：夜间滞留已进入白天复核窗口。")
        resolved += 1
        continue
      }
    }

    if (alert.alertType === "crowd" && alert.severity === "low") {
      const age = Date.now() - alert.createdAt.getTime()
      if (age > 30 * 60 * 1000) {
        await resolveAlert(alert.id, "30 分钟后自动关闭：短时低风险拥堵已回落。")
        resolved += 1
        continue
      }
    }

    if (weatherAlertTypes.includes(alert.alertType)) {
      const relatedActive = activeWeatherAlerts.find(
        (warning) => alert.message.includes(warning.title) || alert.message.includes(warning.text),
      )
      if (!relatedActive) {
        await resolveAlert(alert.id, "天气预警已解除，系统自动关闭。")
        resolved += 1
        continue
      }
    }

    if (alert.alertType === "flood_risk" || alert.alertType === "fire_risk") {
      const pendingCommands = await prisma.controlCommand.findMany({
        where: { status: "pending", triggeredBy: "rule_engine" },
      })

      for (const command of pendingCommands) {
        await prisma.controlCommand.update({
          where: { id: command.id },
          data: { status: "approved" },
        })
        await resolveAlert(
          alert.id,
          `自动批准：水利/安全调度建议（rule_engine）已通过。原建议：${command.reason}`,
        )
        resolved += 1
      }
      if (pendingCommands.length > 0) continue
    }

    if (alert.severity === "high") {
      const age = Date.now() - alert.createdAt.getTime()
      if (age > 2 * 60 * 60 * 1000 && !alert.message.includes("升级提醒")) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            message: `⚠️升级提醒：${Math.floor(age / 3600000)}h 未确认。${alert.message}`,
          },
        })
      }
    }
  }

  const closedActions = await closeOldLowPriorityActions()
  return resolved + closedActions
}

async function resolveAlert(alertId: string, note: string) {
  const existing = await prisma.alert.findUnique({ where: { id: alertId } })
  if (!existing) return

  await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      message: `${note} | 原消息：${existing.message}`,
    },
  })
}

async function closeOldLowPriorityActions() {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const oldReports = await prisma.dailyReport.findMany({
    where: { date: { lte: threeDaysAgo.toISOString().slice(0, 10) } },
  })
  let totalClosed = 0

  for (const report of oldReports) {
    const actionItems = Array.isArray(report.actionItems) ? (report.actionItems as ReportActionItem[]) : []
    let reportClosed = 0
    const updated = actionItems.map((item) => {
      if (item.priority === "low" && item.status !== "closed") {
        reportClosed += 1
        return {
          ...item,
          status: "closed",
          closedAt: new Date().toISOString(),
          closeReason: "连续 3 天未处理，系统自动关闭。",
        }
      }
      return item
    })

    if (reportClosed > 0) {
      await prisma.dailyReport.update({
        where: { id: report.id },
        data: { actionItems: updated as never },
      })
      totalClosed += reportClosed
    }
  }

  return totalClosed
}

function getChinaHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  )
}
