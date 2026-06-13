import { getSiteUrl } from "./site-url"

export interface WeatherSummary {
  temperature: string
  summary: string
  source: string
  updatedAt: string
}

export type WeatherCondition = "sunny" | "rainy" | "hot"

const weatherConditionCache = new Map<string, WeatherCondition>()

export async function getWeatherSummary(): Promise<WeatherSummary> {
  const fallback: WeatherSummary = {
    temperature: "--℃",
    summary: "天气服务待配置：请设置 QWEATHER_API_KEY 后通过 /api/v1/weather 代理读取实时天气。",
    source: "configuration-required",
    updatedAt: new Date().toISOString(),
  }

  try {
    const response = await fetch(new URL("/api/v1/weather", getSiteUrl()), {
      cache: "no-store",
    })

    if (!response.ok) {
      return fallback
    }

    const payload = (await response.json()) as { data?: WeatherSummary }
    return payload.data ?? fallback
  } catch {
    return fallback
  }
}

export async function getWeatherCondition(date: string): Promise<WeatherCondition> {
  const cached = weatherConditionCache.get(date)
  if (cached) return cached

  try {
    const summary = await getWeatherSummary()
    const text = `${summary.summary} ${summary.temperature}`
    const temperature = Number.parseFloat(summary.temperature)
    const condition: WeatherCondition = /雨|rain/i.test(text)
      ? "rainy"
      : Number.isFinite(temperature) && temperature > 32
        ? "hot"
        : "sunny"

    weatherConditionCache.set(date, condition)
    return condition
  } catch {
    weatherConditionCache.set(date, "sunny")
    return "sunny"
  }
}
