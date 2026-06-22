import { getRedis } from "@zouma/database"

import { getCorsHeaders } from "@web/lib/aigc-api"

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`

  try {
    const redis = getRedis()
    if (redis.status === "wait") await redis.connect()

    const count = await redis.incr(windowKey)
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds)
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: (Math.floor(now / windowSeconds) + 1) * windowSeconds,
    }
  } catch {
    console.warn("Rate limiter: Redis unavailable, allowing request")
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds }
  }
}

export function getRateLimitKey(request: Request, endpoint: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  return `${endpoint}:${ip}`
}

export function rateLimitResponse(request: Request, resetAt: number) {
  return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, resetAt - Math.floor(Date.now() / 1000))),
      ...getCorsHeaders(request),
    },
  })
}
