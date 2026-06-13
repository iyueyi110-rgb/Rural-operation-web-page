import "server-only"

import { prisma } from "@zouma/database"
import { computeScores } from "@zouma/utils"

import { getChinaDayRange } from "@web/lib/aigc-api"
import { getWeatherCondition } from "@web/lib/weather"

export async function computeNodeDailyScores(date: string): Promise<void> {
  const nodes = await prisma.spaceNode.findMany()
  const { start, end } = getChinaDayRange(date)
  const weatherCondition = await getWeatherCondition(date)

  for (const node of nodes) {
    const logs = await prisma.presenceLog.findMany({
      where: { nodeId: node.id, timestamp: { gte: start, lte: end } },
    })

    if (logs.length === 0) {
      continue
    }

    const totalVisitors = logs.reduce((sum, log) => sum + log.peopleCount, 0)
    const peakPeopleCount = Math.max(...logs.map((log) => log.peopleCount))
    const logsWithDwell = logs.filter((log) => log.dwellAvgMin != null)
    const avgDwellMin =
      logsWithDwell.length > 0
        ? logsWithDwell.reduce((sum, log) => sum + (log.dwellAvgMin ?? 0), 0) /
          logsWithDwell.length
        : 0
    const revisitIndex = logs.length > 1 ? 0.3 : 0

    const scores = computeScores({
      totalVisitors,
      peakPeopleCount,
      avgDwellMin,
      revisitIndex,
      terrainRisk: node.terrainRisk,
      watersideRisk: node.watersideRisk,
      capacity: node.capacity,
      weatherCondition,
    })

    await prisma.nodeDailyScore.upsert({
      where: { nodeId_date: { nodeId: node.id, date } },
      create: {
        nodeId: node.id,
        date,
        totalVisitors,
        peakPeopleCount,
        avgDwellMin,
        attractiveness: scores.attractiveness,
        safetyRisk: scores.safetyRisk,
        weatherCondition,
      },
      update: {
        totalVisitors,
        peakPeopleCount,
        avgDwellMin,
        attractiveness: scores.attractiveness,
        safetyRisk: scores.safetyRisk,
        weatherCondition,
      },
    })
  }
}
