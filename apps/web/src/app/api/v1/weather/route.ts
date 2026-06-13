import { NextResponse } from "next/server"

const fallbackWeather = {
  data: {
    temperature: "--℃",
    summary: "天气服务待配置：请设置 QWEATHER_API_KEY 后通过 /api/v1/weather 代理读取实时天气。",
    source: "configuration-required",
    updatedAt: new Date().toISOString(),
  },
}

export async function GET() {
  const key = process.env.QWEATHER_API_KEY
  const location = process.env.QWEATHER_LOCATION_ID ?? "101041000"
  const host = process.env.QWEATHER_API_HOST ?? "https://devapi.qweather.com"

  if (!key) {
    return NextResponse.json(fallbackWeather)
  }

  const url = new URL("/v7/weather/now", host)
  url.searchParams.set("location", location)
  url.searchParams.set("key", key)

  try {
    const response = await fetch(url, { next: { revalidate: 600 } })

    if (!response.ok) {
      console.error("QWeather request failed:", response.status)
      return NextResponse.json(fallbackWeather)
    }

    const payload = (await response.json()) as {
      now?: { temp?: string; text?: string; obsTime?: string }
      updateTime?: string
    }

    return NextResponse.json({
      data: {
        temperature: payload.now?.temp ? `${payload.now.temp}℃` : "--℃",
        summary: payload.now?.text ? `实时天气：${payload.now.text}。路线建议会结合天气代理结果动态调整。` : fallbackWeather.data.summary,
        source: "qweather",
        updatedAt: payload.now?.obsTime ?? payload.updateTime ?? new Date().toISOString(),
      },
    })
  } catch (caughtError) {
    console.error("QWeather request failed:", caughtError)
    return NextResponse.json(fallbackWeather)
  }
}
