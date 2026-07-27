import "server-only"

import { prisma } from "@zouma/database"
import { ModelProviderAdapter } from "@zouma/utils"

import { getChinaDateString, getChinaDayRange } from "@web/lib/aigc-api"
import { getWeatherSummary } from "@web/lib/weather"

export async function answerOperationalQuestion(question: string) {
  const context = await fetchDashboardSummary()

  try {
    const result = await ModelProviderAdapter.complete(
      `问题：${question}\n数据：${JSON.stringify(context)}\n请用中文回答，引用具体数字，不超过 200 字。如果当前数据不支持该查询，请回答“抱歉，当前数据暂不支持该查询。”`,
      {
        systemPrompt:
          "你是走马村 AIGC 云脑数据分析助手。只能根据给定运营数据回答，不要生成 SQL，不要要求访问数据库，不要输出个人隐私信息。",
        temperature: 0.4,
      },
    )
    return result.content.trim() || "抱歉，当前数据暂不支持该查询。"
  } catch (error) {
    console.error("AI operational query failed:", error)
    return "AI 助手暂时不可用，请稍后重试。"
  }
}

async function fetchDashboardSummary() {
  const date = getChinaDateString()
  const { start, end } = getChinaDayRange(date)

  const [nodeScores, ordersByNode, presenceByNode, activeAlerts, weather] = await Promise.all([
    prisma.nodeDailyScore.findMany({
      where: { date },
      include: { node: true },
      orderBy: { attractiveness: "desc" },
      take: 8,
    }),
    prisma.unifiedOrder.groupBy({
      by: ["nodeId"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.presenceLog.groupBy({
      by: ["nodeId"],
      where: { timestamp: { gte: start, lte: end } },
      _sum: { peopleCount: true },
    }),
    prisma.alert.findMany({
      where: { status: "active" },
      select: { alertType: true, severity: true, nodeId: true, message: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getWeatherSummary(),
  ])

  const orderMap = new Map(ordersByNode.map((item) => [item.nodeId, item]))
  const presenceMap = new Map(presenceByNode.map((item) => [item.nodeId, item]))
  const nodeSummary = nodeScores.map((score) => {
    const orderCount = orderMap.get(score.nodeId)?._count._all ?? 0
    const revenue = orderMap.get(score.nodeId)?._sum.totalAmount ?? 0
    const visitors = presenceMap.get(score.nodeId)?._sum.peopleCount ?? 0

    return {
      slug: score.node.slug,
      nameKey: score.node.nameKey,
      visitors,
      orderCount,
      revenue,
      conversionRate: visitors > 0 ? Math.round((orderCount / visitors) * 1000) / 10 : 0,
      attractiveness: score.attractiveness,
      safetyRisk: score.safetyRisk,
    }
  })

  return {
    date,
    weather,
    nodes: nodeSummary,
    lowestConversionNode: [...nodeSummary]
      .filter((node) => node.visitors > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate)[0] ?? null,
    activeAlerts,
    totals: {
      visitors: nodeSummary.reduce((sum, node) => sum + node.visitors, 0),
      orders: nodeSummary.reduce((sum, node) => sum + node.orderCount, 0),
      revenue: nodeSummary.reduce((sum, node) => sum + node.revenue, 0),
      activeAlertCount: activeAlerts.length,
    },
  }
}
