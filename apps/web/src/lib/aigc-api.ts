import { NextResponse } from "next/server"

export { fetchWithTimeout } from "@web/lib/fetch-timeout"
import { getAllowedCorsOrigins } from "@web/lib/site-url"

export function getCorsHeaders(request: Request) {
  const allowedOrigins = getAllowedCorsOrigins()
  const requestOrigin = request.headers.get("origin")
  const allowedOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0]

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Admin-Token, X-API-Key, Authorization, X-Villager-Token",
    Vary: "Origin",
  }
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init?: ResponseInit,
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(request),
      ...init?.headers,
    },
  })
}

export function optionsResponse(request: Request) {
  const allowedOrigins = getAllowedCorsOrigins()
  const requestOrigin = request.headers.get("origin")

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return new Response(null, { status: 403, headers: getCorsHeaders(request) })
  }

  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

export function getChinaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function getChinaDayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+08:00`),
    end: new Date(`${date}T23:59:59.999+08:00`),
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
