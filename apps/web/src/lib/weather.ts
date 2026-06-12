import { getSiteUrl } from "./site-url"

export interface WeatherSummary {
  temperature: string
  summary: string
  source: string
  updatedAt: string
}

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
