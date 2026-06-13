import "server-only"

import { DAILY_REPORT_SYSTEM_PROMPT } from "@zouma/prompts/daily-report"
import { ModelProviderAdapter } from "@zouma/utils"
import { prisma } from "@zouma/database"

import { getChinaDateString, getChinaDayRange, isPlainObject } from "@web/lib/aigc-api"
import { getWeatherSummary } from "@web/lib/weather"
import { computeNodeDailyScores } from "@web/lib/node-scoring"

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
  }>
}

function extractJsonContent(content: string) {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]) as unknown
      } catch {
        // Continue to broad extraction below.
      }
    }

    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown
    }

    throw new Error("AI report JSON could not be parsed")
  }
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
    })),
  }
}

export async function generateDailyReport(date = getChinaDateString()) {
  const { start, end } = getChinaDayRange(date)

  await computeNodeDailyScores(date)

  const [presenceAgg, orderAgg, feedbackAgg, nodeScores, weather] = await Promise.all([
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
  ])

  const metrics = {
    totalVisitors: presenceAgg._sum.peopleCount ?? 0,
    peakPeopleCount: presenceAgg._max.peopleCount ?? 0,
    avgDwellMin: Math.round((presenceAgg._avg.dwellAvgMin ?? 0) * 10) / 10,
    totalRevenue: orderAgg._sum.totalAmount ?? 0,
    totalOrders: orderAgg._count._all,
    feedbackCount: feedbackAgg._count._all,
    avgSatisfaction: Math.round((feedbackAgg._avg.rating ?? 0) * 10) / 10,
    alertCount: nodeScores.filter((score) => score.safetyRisk > 70).length,
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
  }

  const result = await ModelProviderAdapter.complete(JSON.stringify(context), {
    systemPrompt: DAILY_REPORT_SYSTEM_PROMPT,
    temperature: 0.2,
  })
  const parsed = normalizeReportPayload(extractJsonContent(result.content))

  return prisma.dailyReport.upsert({
    where: { date },
    create: {
      date,
      title: parsed.title,
      summary: parsed.summary,
      sections: parsed.sections,
      metrics: parsed.metrics,
      actionItems: parsed.actionItems,
      status: "published",
      generatedAt: new Date(),
    },
    update: {
      title: parsed.title,
      summary: parsed.summary,
      sections: parsed.sections,
      metrics: parsed.metrics,
      actionItems: parsed.actionItems,
      status: "published",
      generatedAt: new Date(),
    },
  })
}
