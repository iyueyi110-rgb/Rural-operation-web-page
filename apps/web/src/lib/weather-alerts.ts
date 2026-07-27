import "server-only"

import type { WeatherAlertData, WeatherAlertType } from "@zouma/contracts"

interface QWeatherWarning {
  id?: string
  type?: string
  typeName?: string
  title?: string
  text?: string
  level?: string
  startTime?: string
  endTime?: string
  pubTime?: string
}

export async function fetchWeatherAlerts(): Promise<WeatherAlertData[]> {
  const key = process.env.QWEATHER_API_KEY
  if (!key) return []

  const host = process.env.QWEATHER_API_HOST ?? "https://devapi.qweather.com"
  const location = process.env.QWEATHER_LOCATION_ID ?? "101040100"
  const url = new URL("/v7/warning/now", host)
  url.searchParams.set("location", location)
  url.searchParams.set("key", key)

  try {
    const response = await fetch(url, { next: { revalidate: 600 } })
    if (!response.ok) {
      console.error("QWeather warning request failed:", response.status)
      return []
    }

    const payload = (await response.json()) as { warning?: QWeatherWarning[] | null }
    return (payload.warning ?? []).map(mapWarning)
  } catch (error) {
    console.error("QWeather warning request failed:", error)
    return []
  }
}

function mapWarning(warning: QWeatherWarning): WeatherAlertData {
  const type = mapWarningType(warning.type)
  const createdAt = warning.pubTime ?? warning.startTime ?? new Date().toISOString()

  return {
    id: warning.id ?? `weather-${type}-${createdAt}`,
    type,
    severity: mapWarningSeverity(warning.level),
    title: warning.title ?? warning.typeName ?? "天气预警",
    text: warning.text ?? warning.title ?? "和风天气发布预警，请现场运营人员关注。",
    startTime: warning.startTime,
    endTime: warning.endTime,
    createdAt,
    source: "qweather",
  }
}

function mapWarningType(code?: string): WeatherAlertType {
  const normalized = code?.trim().toUpperCase()
  if (normalized === "11B01") return "rainstorm"
  if (normalized === "11B02") return "snowstorm"
  if (normalized === "11B03") return "heat"
  if (normalized === "11B04") return "wind"
  if (normalized === "11B06") return "typhoon"
  return "other"
}

function mapWarningSeverity(level?: string): WeatherAlertData["severity"] {
  const text = level ?? ""
  if (/红|橙|red|orange/i.test(text)) return "high"
  if (/黄|yellow/i.test(text)) return "medium"
  return "low"
}
