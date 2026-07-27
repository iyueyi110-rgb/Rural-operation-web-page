import { NextResponse } from "next/server"

import {
  defaultAdminLoginRateLimiter,
  trustedAdminClientIdentifier,
  type AdminLoginRateLimiter,
} from "./admin-login-rate-limit.server"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  authenticateAdminPassword,
  createAdminSession,
} from "./admin-session.server"

interface AdminSessionHandlerDependencies {
  expectedPassword?: string
  sessionSecret?: string
  limiter?: AdminLoginRateLimiter
  minimumDelayMs?: number
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  identifyClient?: (request: Request) => string
}

function loginErrorResponse(
  request: Request,
  options: {
    code: "invalid_credentials" | "not_configured" | "rate_limited"
    message: string
    status: number
    retryAfterSeconds?: number
  },
) {
  const acceptsHtml = request.headers.get("accept")?.includes("text/html")
  if (acceptsHtml) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", options.code)
    if (options.retryAfterSeconds) {
      loginUrl.searchParams.set("retryAfter", String(options.retryAfterSeconds))
    }
    const response = NextResponse.redirect(loginUrl, 303)
    if (options.retryAfterSeconds) {
      response.headers.set("Retry-After", String(options.retryAfterSeconds))
    }
    return response
  }

  return Response.json(
    { error: options.message },
    {
      status: options.status,
      ...(options.retryAfterSeconds
        ? { headers: { "Retry-After": String(options.retryAfterSeconds) } }
        : {}),
    },
  )
}

export function createAdminSessionHandler(
  dependencies: AdminSessionHandlerDependencies = {},
) {
  const limiter = dependencies.limiter ?? defaultAdminLoginRateLimiter
  const minimumDelayMs = dependencies.minimumDelayMs ?? 350
  const now = dependencies.now ?? Date.now
  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const identifyClient =
    dependencies.identifyClient ?? trustedAdminClientIdentifier

  return async function postAdminSession(request: Request) {
    const expectedPassword =
      dependencies.expectedPassword ?? process.env.ADMIN_LOGIN_PASSWORD ?? ""
    const sessionSecret =
      dependencies.sessionSecret ?? process.env.ADMIN_SESSION_SECRET ?? ""
    if (!expectedPassword || sessionSecret.length < 32) {
      return loginErrorResponse(request, {
        code: "not_configured",
        message: "Admin session is not configured",
        status: 503,
      })
    }

    const clientId = identifyClient(request)
    const startedAt = now()
    const decision = limiter.reserveAttempt(clientId, startedAt)
    if (!decision.allowed) {
      return loginErrorResponse(request, {
        code: "rate_limited",
        message: "Too many login attempts",
        status: 429,
        retryAfterSeconds: decision.retryAfterSeconds,
      })
    }

    const form = await request.formData().catch(() => null)
    const password = form?.get("password")
    const authenticated =
      typeof password === "string" &&
      (await authenticateAdminPassword(password, expectedPassword))
    const remainingDelay = minimumDelayMs - (now() - startedAt)
    if (remainingDelay > 0) await sleep(remainingDelay)
    if (!authenticated) {
      return loginErrorResponse(request, {
        code: "invalid_credentials",
        message: "Invalid credentials",
        status: 401,
      })
    }

    const session = await createAdminSession(sessionSecret)
    limiter.recordSuccess(clientId, now())
    const response = NextResponse.redirect(
      new URL("/simulations", request.url),
      303,
    )
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: session,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    })
    return response
  }
}
