import "server-only"

import { prisma } from "@zouma/database"
import { ModelProviderAdapter } from "@zouma/utils"

import { getChinaDayRange, isPlainObject } from "@web/lib/aigc-api"
import { extractJsonContent } from "@web/lib/ai-json"
import { getWeatherSummary } from "@web/lib/weather"

export interface TrafficForecast {
  low: number
  high: number
  confidence: "high" | "medium" | "low"
}

export async function predictTomorrowTraffic(): Promise<TrafficForecast> {
  const dailyTraffic = await Promise.all(
    Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - index - 1)
      return date.toISOString().slice(0, 10)
    }).map(async (date) => {
      const { start, end } = getChinaDayRange(date)
      const aggregate = await prisma.presenceLog.aggregate({
        where: { timestamp: { gte: start, lte: end } },
        _sum: { peopleCount: true },
      })
      return { date, total: aggregate._sum.peopleCount ?? 0 }
    }),
  )

  const fallback = buildFallbackForecast(dailyTraffic.map((item) => item.total))

  try {
    const weather = await getWeatherSummary()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isWeekend = tomorrow.getDay() === 0 || tomorrow.getDay() === 6
    const result = await ModelProviderAdapter.complete(
      `过去 14 天客流：${JSON.stringify(dailyTraffic)}。明日天气：${weather.summary}。明日是${isWeekend ? "周末" : "工作日"}。预测明日总客流，返回 JSON：{"low":80,"high":120,"confidence":"high|medium|low"}。`,
      {
        systemPrompt: "你是走马村客流预测助手。根据历史数据和天气返回客流预测。只返回 JSON。",
        temperature: 0.2,
      },
    )
    return normalizeForecast(extractJsonContent(result.content)) ?? fallback
  } catch (error) {
    console.error("Traffic forecast fell back to moving average:", error)
    return fallback
  }
}

function normalizeForecast(value: unknown): TrafficForecast | null {
  if (!isPlainObject(value)) return null
  const low = Math.max(0, Math.round(Number(value.low)))
  const high = Math.max(low, Math.round(Number(value.high)))
  const confidence = value.confidence === "high" || value.confidence === "medium" ? value.confidence : "low"

  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  return { low, high, confidence }
}

function buildFallbackForecast(values: number[]): TrafficForecast {
  const meaningful = values.filter((value) => value > 0)
  const source = meaningful.length > 0 ? meaningful : values
  const average = source.length > 0 ? source.reduce((sum, value) => sum + value, 0) / source.length : 80
  const low = Math.max(0, Math.round(average * 0.8))
  const high = Math.max(low + 1, Math.round(average * 1.2))

  return { low, high, confidence: "low" }
}
