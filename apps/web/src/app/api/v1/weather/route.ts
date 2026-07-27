import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

const fallbackWeather = {
  data: {
    temperature: "--℃",
    summary: "天气服务待配置：请设置 QWEATHER_API_KEY 后通过 /api/v1/weather 代理读取实时天气。",
    source: "configuration-required",
    updatedAt: new Date().toISOString(),
  },
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const key = process.env.QWEATHER_API_KEY
  const location = process.env.QWEATHER_LOCATION_ID ?? "101040100"
  const host = process.env.QWEATHER_API_HOST ?? "https://devapi.qweather.com"

  if (!key) {
    return jsonResponse(request, fallbackWeather)
  }

  const url = new URL("/v7/weather/now", host)
  url.searchParams.set("location", location)
  url.searchParams.set("key", key)

  try {
    const response = await fetch(url, { next: { revalidate: 600 } })

    if (!response.ok) {
      console.error("QWeather request failed:", response.status)
      return jsonResponse(request, fallbackWeather)
    }

    const payload = (await response.json()) as {
      now?: { temp?: string; text?: string; obsTime?: string }
      updateTime?: string
    }

    return jsonResponse(request, {
      data: {
        temperature: payload.now?.temp ? `${payload.now.temp}℃` : "--℃",
        summary: payload.now?.text ? `实时天气：${payload.now.text}。路线建议会结合天气代理结果动态调整。` : fallbackWeather.data.summary,
        source: "qweather",
        updatedAt: payload.now?.obsTime ?? payload.updateTime ?? new Date().toISOString(),
      },
    })
  } catch (caughtError) {
    console.error("QWeather request failed:", caughtError)
    return jsonResponse(request, fallbackWeather)
  }
}
