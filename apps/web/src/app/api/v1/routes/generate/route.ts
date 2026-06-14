import { NextResponse } from "next/server"
import { prisma } from "@zouma/database"
import { ModelProviderAdapter } from "@zouma/utils"

import {
  routeOptions,
  selectRouteOption,
  type RouteAudience,
  type RouteDuration,
  type RouteWeather,
} from "@web/lib/routes-data"

const durations: RouteDuration[] = ["halfDay", "oneDay", "twoDays"]
const audiences: RouteAudience[] = ["senior", "family", "regular"]
const weathers: RouteWeather[] = ["sunny", "rainy", "hot"]

function isRouteDuration(value: unknown): value is RouteDuration {
  return typeof value === "string" && durations.includes(value as RouteDuration)
}

function isRouteAudience(value: unknown): value is RouteAudience {
  return typeof value === "string" && audiences.includes(value as RouteAudience)
}

function isRouteWeather(value: unknown): value is RouteWeather {
  return typeof value === "string" && weathers.includes(value as RouteWeather)
}

function parseRouteId(content: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { routeId?: string }
    return parsed.routeId ?? null
  } catch {
    return null
  }
}

function formatRouteTags() {
  return routeOptions
    .map((route) => `- ${route.id} (${route.duration}, ${route.audience}, ${route.weather})`)
    .join("\n")
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || !isRouteDuration(body.duration) || !isRouteAudience(body.audience) || !isRouteWeather(body.weather)) {
    return NextResponse.json({ error: { code: "INVALID_ROUTE_INPUT", message: "Route input is invalid." } }, { status: 400 })
  }

  const fallbackRoute = selectRouteOption({
    duration: body.duration,
    audience: body.audience,
    weather: body.weather,
  })

  const prompt = [
    "请从给定路线中为游客选择最合适的一条走马村路线。",
    `输入条件：duration=${body.duration}, audience=${body.audience}, weather=${body.weather}。`,
    "可选路线：",
    formatRouteTags(),
    "只返回 JSON：{\"routeId\":\"one-id-from-list\",\"reason\":\"short reason\"}。",
  ].join("\n")

  try {
    const completion = await ModelProviderAdapter.complete(prompt, {
      systemPrompt: "你是走马村四境游线规划助手。根据游客的时长、人群、天气，从给定路线中推荐最合适的一条。只返回 JSON。",
    })
    const routeId = parseRouteId(completion.content)
    const route = routeOptions.find((option) => option.id === routeId) ?? fallbackRoute

    prisma.routeGenerationLog.create({
      data: {
        routeId: route.id,
        duration: body.duration,
        audience: body.audience,
        weather: body.weather,
        provider: completion.provider,
      },
    }).catch((error) => console.error("Route generation log failed:", error))

    return NextResponse.json({
      data: {
        route,
        provider: completion.provider,
        model: completion.model,
        latencyMs: completion.latencyMs,
      },
    })
  } catch (error) {
    prisma.routeGenerationLog.create({
      data: {
        routeId: fallbackRoute.id,
        duration: body.duration,
        audience: body.audience,
        weather: body.weather,
        provider: "configuration-required",
      },
    }).catch((logError) => console.error("Route generation log failed:", logError))

    return NextResponse.json({
      data: {
        route: fallbackRoute,
        provider: "configuration-required",
        model: "ModelProviderAdapter",
        latencyMs: 0,
        message: error instanceof Error ? error.message : "Model provider is not configured",
      },
    })
  }
}
