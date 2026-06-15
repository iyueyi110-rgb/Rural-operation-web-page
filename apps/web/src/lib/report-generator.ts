import "server-only"

import { DAILY_REPORT_SYSTEM_PROMPT } from "@zouma/prompts/daily-report"
import { ModelProviderAdapter } from "@zouma/utils"
import { prisma } from "@zouma/database"

import { getChinaDateString, getChinaDayRange, isPlainObject } from "@web/lib/aigc-api"
import { extractJsonContent } from "@web/lib/ai-json"
import { getWeatherSummary } from "@web/lib/weather"
import { computeNodeDailyScores } from "@web/lib/node-scoring"
import { generateControlCommands } from "@web/lib/infrastructure-control"
import { generateCareAdvice } from "@web/lib/care-advisor"
import { predictTomorrowTraffic } from "@web/lib/traffic-forecast"
import { runAnomalyDetection } from "@web/lib/alert-engine"
import { predictDeviceIssues } from "@web/lib/device-predictor"

interface GeneratedReportPayload {
  title: string
  summary: string
  sections: Array<{ type: string; title: string; content: string }>
  metrics: Record<string, number>
  actionItems: Array<{
    priority: string
    category: string
    action: string
    deadline?: string
    status?: string
  }>
}

function normalizeReportPayload(value: unknown): GeneratedReportPayload {
  if (!isPlainObject(value)) {
    throw new Error("AI report payload is not an object")
  }

  const title = typeof value.title === "string" ? value.title : ""
  const summary = typeof value.summary === "string" ? value.summary : ""
  const sections = Array.isArray(value.sections) ? value.sections.filter(isPlainObject) : []
  const metrics = isPlainObject(value.metrics) ? value.metrics : {}
  const actionItems = Array.isArray(value.actionItems) ? value.actionItems.filter(isPlainObject) : []

  if (!title || !summary || sections.length === 0 || actionItems.length < 3) {
    throw new Error("AI report payload is missing required fields")
  }

  return {
    title,
    summary,
    sections: sections.map((section) => ({
      type: typeof section.type === "string" ? section.type : "visitor_flow",
      title: typeof section.title === "string" ? section.title : "分析详情",
      content: typeof section.content === "string" ? section.content : "暂无足够数据",
    })),
    metrics: {
      totalVisitors: Number(metrics.totalVisitors ?? 0),
      totalRevenue: Number(metrics.totalRevenue ?? 0),
      totalOrders: Number(metrics.totalOrders ?? 0),
      alertCount: Number(metrics.alertCount ?? 0),
      feedbackCount: Number(metrics.feedbackCount ?? 0),
      avgSatisfaction: Number(metrics.avgSatisfaction ?? 0),
    },
    actionItems: actionItems.slice(0, 5).map((item) => ({
      priority: typeof item.priority === "string" ? item.priority : "medium",
      category: typeof item.category === "string" ? item.category : "operation",
      action: typeof item.action === "string" ? item.action : "补充运营数据后复核。",
      deadline: typeof item.deadline === "string" ? item.deadline : undefined,
      status: typeof item.status === "string" ? item.status : "active",
    })),
  }
}

export async function generateDailyReport(date = getChinaDateString()) {
  const { start, end } = getChinaDayRange(date)

  await computeNodeDailyScores(date)
  await runAnomalyDetection(date)

  const offlineThreshold = new Date(Date.now() - 30 * 60 * 1000)
  const [presenceAgg, orderAgg, feedbackAgg, nodeScores, weather, offlineDevices, productRanking, completedTasks, trafficForecast] = await Promise.all([
    prisma.presenceLog.aggregate({
      where: { timestamp: { gte: start, lte: end } },
      _sum: { peopleCount: true },
      _max: { peopleCount: true },
      _avg: { dwellAvgMin: true },
    }),
    prisma.unifiedOrder.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.feedbackTicket.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.nodeDailyScore.findMany({
      where: { date },
      include: { node: true },
      orderBy: { safetyRisk: "desc" },
      take: 8,
    }),
    getWeatherSummary(),
    prisma.device.findMany({
      where: {
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: offlineThreshold } }],
        status: "active",
      },
      orderBy: { lastSeenAt: "asc" },
      take: 5,
    }),
    prisma.unifiedOrder.groupBy({
      by: ["productName"],
      where: { orderType: "product_order", createdAt: { gte: start, lte: end } },
      _sum: { quantity: true, totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { status: "completed", updatedAt: { gte: start, lte: end } },
      select: { villagerId: true, earnings: true },
    }),
    predictTomorrowTraffic(),
  ])

  const villagerStats = {
    completedTaskCount: completedTasks.length,
    totalEarnings: completedTasks.reduce((sum, task) => sum + task.earnings, 0),
    participantCount: new Set(completedTasks.map((task) => task.villagerId).filter(Boolean)).size,
  }
  const trafficForecastData = {
    low: trafficForecast.low,
    high: trafficForecast.high,
    confidence: trafficForecast.confidence,
  }

  const metrics = {
    totalVisitors: presenceAgg._sum.peopleCount ?? 0,
    peakPeopleCount: presenceAgg._max.peopleCount ?? 0,
    avgDwellMin: Math.round((presenceAgg._avg.dwellAvgMin ?? 0) * 10) / 10,
    totalRevenue: orderAgg._sum.totalAmount ?? 0,
    totalOrders: orderAgg._count._all,
    feedbackCount: feedbackAgg._count._all,
    avgSatisfaction: Math.round((feedbackAgg._avg.rating ?? 0) * 10) / 10,
    alertCount: nodeScores.filter((score) => score.safetyRisk > 70).length,
    villagerStats,
    trafficForecast: trafficForecastData,
  }

  const context = {
    date,
    metrics,
    weather,
    highRiskNodes: nodeScores
      .filter((score) => score.safetyRisk > 70)
      .map((score) => ({
        slug: score.node.slug,
        nameKey: score.node.nameKey,
        safetyRisk: score.safetyRisk,
        attractiveness: score.attractiveness,
      })),
    topNodes: [...nodeScores]
      .sort((a, b) => b.attractiveness - a.attractiveness)
      .slice(0, 5)
      .map((score) => ({
        slug: score.node.slug,
        nameKey: score.node.nameKey,
        attractiveness: score.attractiveness,
        safetyRisk: score.safetyRisk,
      })),
    offlineDevices: offlineDevices.map((device) => ({
      deviceId: device.deviceId,
      name: device.name,
      type: device.type,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    })),
    productRanking: productRanking.map((item) => ({
      productName: item.productName,
      quantity: item._sum.quantity ?? 0,
      revenue: item._sum.totalAmount ?? 0,
      orderCount: item._count._all,
    })),
    villagerStats,
    trafficForecast: trafficForecastData,
  }

  const result = await ModelProviderAdapter.complete(JSON.stringify(context), {
    systemPrompt: DAILY_REPORT_SYSTEM_PROMPT,
    temperature: 0.2,
  })
  const parsed = normalizeReportPayload(extractJsonContent(result.content))
  const [infrastructureCommands, careAdvice, devicePredictions] = await Promise.all([
    generateControlCommands(),
    generateCareAdvice(),
    predictDeviceIssues(),
  ])
  const infrastructureSection =
    infrastructureCommands.length > 0
      ? {
          type: "infrastructure",
          title: "设施调度",
          content: infrastructureCommands.map((command) => command.reason).join("；"),
        }
      : {
          type: "infrastructure",
          title: "设施调度",
          content: "暂无传感器数据，设施调度建议待生成。",
        }
  const actionItems = [
    ...parsed.actionItems,
    ...infrastructureCommands.map((command) => ({
      priority: command.priority === "critical" ? "high" : command.priority,
      category: "facility",
      action: command.reason,
      status: "active",
    })),
    ...offlineDevices.map((device) => ({
      priority: "medium",
      category: "facility",
      action: `设备 ${device.name}（${device.deviceId}）超过 30 分钟未上报，请巡检供电、网络与安装位置。`,
      status: "active",
    })),
    ...devicePredictions.map((prediction) => ({
      priority: prediction.priority,
      category: "facility",
      action: prediction.message,
      status: "active",
    })),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.action === item.action) === index)
  const productSection =
    productRanking.length > 0
      ? {
          type: "consumption",
          title: "农产品消费排行",
          content: productRanking
            .map((item, index) => `${index + 1}. ${item.productName}：${item._sum.quantity ?? 0} 份，¥${item._sum.totalAmount ?? 0}`)
            .join("；"),
        }
      : null
  const careAdviceSection = {
    type: "feedback",
    title: "AI 养护建议",
    content: careAdvice,
  }
  const trafficForecastSection = {
    type: "visitor_flow",
    title: "AI 客流预测",
    content: `预计明日客流 ${trafficForecastData.low}-${trafficForecastData.high} 人，置信度 ${formatConfidence(trafficForecastData.confidence)}。`,
  }
  const devicePredictionSection =
    devicePredictions.length > 0
      ? {
          type: "infrastructure",
          title: "AI 设备健康预测",
          content: devicePredictions.map((prediction) => prediction.message).join("；"),
        }
      : null
  const deviceInspectionSection = {
    type: "infrastructure",
    title: "设备巡检",
    content:
      offlineDevices.length > 0
        ? `${offlineDevices.length} 台设备离线或超时未上报，已生成巡检任务。`
        : "所有设备运行正常，无需巡检。",
  }
  const villagerSection = {
    type: "feedback",
    title: "村民任务协作",
    content: `当日完成任务 ${villagerStats.completedTaskCount} 个，任务收益合计 ¥${villagerStats.totalEarnings}，参与村民 ${villagerStats.participantCount} 人。`,
  }
  const sections = [
    ...parsed.sections.filter((section) => section.type !== "infrastructure"),
    ...(productSection ? [productSection] : []),
    careAdviceSection,
    trafficForecastSection,
    ...(devicePredictionSection ? [devicePredictionSection] : []),
    deviceInspectionSection,
    villagerSection,
    infrastructureSection,
  ]
  const reportMetrics = {
    ...parsed.metrics,
    villagerStats,
    trafficForecast: trafficForecastData,
    productRanking: productRanking.map((item) => ({
      productName: item.productName,
      quantity: item._sum.quantity ?? 0,
      revenue: item._sum.totalAmount ?? 0,
      orderCount: item._count._all,
    })),
  }

  return prisma.dailyReport.upsert({
    where: { date },
    create: {
      date,
      title: parsed.title,
      summary: parsed.summary,
      sections,
      metrics: reportMetrics,
      actionItems,
      status: "published",
      generatedAt: new Date(),
    },
    update: {
      title: parsed.title,
      summary: parsed.summary,
      sections,
      metrics: reportMetrics,
      actionItems,
      status: "published",
      generatedAt: new Date(),
    },
  })
}

function formatConfidence(confidence: string) {
  if (confidence === "high") return "高"
  if (confidence === "medium") return "中"
  return "低"
}
