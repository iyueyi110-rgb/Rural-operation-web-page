import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { NextRequest } from "next/server"

import { POST as createSessionRoute } from "../app/api/admin/session/route"
import { middleware } from "../middleware"
import { proxyAdminRequest } from "./admin-bff.server"
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdminPassword,
  createAdminSession,
  verifyAdminSession,
} from "./admin-session.server"

const adminSourceRoot = path.resolve(import.meta.dirname, "..")

function productionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return productionSources(absolute)
    if (!/\.(?:ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) {
      return []
    }
    return [absolute]
  })
}

test("Admin browser sources use the same-origin BFF and contain no service token", () => {
  const sources = productionSources(adminSourceRoot).map((file) => ({
    file,
    source: readFileSync(file, "utf8"),
  }))
  const leaked = sources.filter(({ source }) =>
    source.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"),
  )

  assert.deepEqual(
    leaked.map(({ file }) => path.relative(adminSourceRoot, file)),
    [],
  )

  const apiSource = readFileSync(
    path.join(import.meta.dirname, "admin-api.ts"),
    "utf8",
  )
  assert.match(apiSource, /adminApiBase\s*=\s*["']\/api\/admin["']/)
  assert.doesNotMatch(apiSource, /X-Admin-Token|ADMIN_API_TOKEN/)
})

test("Admin sessions require the server-only password and expire", async () => {
  const secret = "s".repeat(32)
  assert.equal(await authenticateAdminPassword("correct", "correct"), true)
  assert.equal(await authenticateAdminPassword("wrong", "correct"), false)
  assert.equal(await authenticateAdminPassword("", ""), false)

  const session = await createAdminSession(secret, 1_000, 60)
  assert.equal(await verifyAdminSession(session, secret, 60_999), true)
  assert.equal(await verifyAdminSession(session, secret, 61_000), false)
  assert.equal(
    await verifyAdminSession(`${session.slice(0, -1)}x`, secret, 2_000),
    false,
  )
})

test("unauthenticated BFF requests are rejected without calling Web", async () => {
  let upstreamCalls = 0
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/simulations/runs"),
    ["simulations", "runs"],
    {
      sessionSecret: "s".repeat(32),
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async () => {
        upstreamCalls += 1
        return new Response("unexpected")
      },
    },
  )

  assert.equal(response.status, 401)
  assert.equal(upstreamCalls, 0)
})

test("only the authenticated server proxy adds the Web admin token", async () => {
  const secret = "s".repeat(32)
  const session = await createAdminSession(secret, Date.now(), 60_000)
  let upstream: Request | undefined
  const response = await proxyAdminRequest(
    new Request(
      "http://admin.local/api/admin/simulations/runs?page=2&pageSize=10",
      {
        headers: {
          cookie: `${ADMIN_SESSION_COOKIE}=${session}`,
          "x-admin-token": "attacker-controlled",
        },
      },
    ),
    ["simulations", "runs"],
    {
      sessionSecret: secret,
      webApiBase: "http://web.local/api/v1/",
      adminApiToken: "web-service-token",
      fetcher: async (input, init) => {
        upstream = new Request(input, init)
        return Response.json({ data: { items: [] } })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(
    upstream?.url,
    "http://web.local/api/v1/simulations/runs?page=2&pageSize=10",
  )
  assert.equal(upstream?.headers.get("x-admin-token"), "web-service-token")
  assert.equal(upstream?.headers.has("cookie"), false)
})

test("the BFF removes stale upstream compression headers", async () => {
  const secret = "s".repeat(32)
  const session = await createAdminSession(secret, Date.now(), 60_000)
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/knowledge/query", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${session}`,
        origin: "http://admin.local",
        "content-type": "application/json",
      },
      body: JSON.stringify({ question: "养护照片不清晰时怎么办？" }),
    }),
    ["knowledge", "query"],
    {
      sessionSecret: secret,
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async () =>
        new Response(JSON.stringify({ answer: "知识尚未发布" }), {
          headers: {
            "content-type": "application/json",
            "content-encoding": "gzip",
            "transfer-encoding": "chunked",
          },
        }),
    },
  )

  assert.equal(response.status, 200)
  assert.equal(response.headers.has("content-encoding"), false)
  assert.equal(response.headers.has("transfer-encoding"), false)
  assert.deepEqual(await response.json(), { answer: "知识尚未发布" })
})

test("the BFF rejects cross-origin mutations before forwarding", async () => {
  const secret = "s".repeat(32)
  const session = await createAdminSession(secret)
  let upstreamCalls = 0
  const response = await proxyAdminRequest(
    new Request("http://admin.local/api/admin/simulations/runs", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${session}`,
        origin: "http://attacker.local",
      },
      body: "{}",
    }),
    ["simulations", "runs"],
    {
      sessionSecret: secret,
      webApiBase: "http://web.local/api/v1",
      adminApiToken: "web-service-token",
      fetcher: async () => {
        upstreamCalls += 1
        return new Response("unexpected")
      },
    },
  )

  assert.equal(response.status, 403)
  assert.equal(upstreamCalls, 0)
})

test("the login route creates a hardened HttpOnly cookie only for valid credentials", async () => {
  const previousPassword = process.env.ADMIN_LOGIN_PASSWORD
  const previousSecret = process.env.ADMIN_SESSION_SECRET
  process.env.ADMIN_LOGIN_PASSWORD = "correct-password"
  process.env.ADMIN_SESSION_SECRET = "s".repeat(32)
  try {
    const validBody = new URLSearchParams({ password: "correct-password" })
    const accepted = await createSessionRoute(
      new Request("http://admin.local/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: validBody,
      }),
    )
    assert.equal(accepted.status, 303)
    assert.match(accepted.headers.get("set-cookie") ?? "", /HttpOnly/i)
    assert.match(accepted.headers.get("set-cookie") ?? "", /SameSite=Strict/i)

    const denied = await createSessionRoute(
      new Request("http://admin.local/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ password: "wrong" }),
      }),
    )
    assert.equal(denied.status, 401)
    assert.equal(denied.headers.has("set-cookie"), false)

    const browserDenied = await createSessionRoute(
      new Request("http://admin.local/api/admin/session", {
        method: "POST",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ password: "wrong" }),
      }),
    )
    assert.equal(browserDenied.status, 303)
    assert.equal(
      browserDenied.headers.get("location"),
      "http://admin.local/login?error=invalid_credentials",
    )
    assert.equal(browserDenied.headers.has("set-cookie"), false)
  } finally {
    if (previousPassword === undefined) delete process.env.ADMIN_LOGIN_PASSWORD
    else process.env.ADMIN_LOGIN_PASSWORD = previousPassword
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
    else process.env.ADMIN_SESSION_SECRET = previousSecret
  }
})

test("middleware rejects an unauthenticated Admin page", async () => {
  const previousSecret = process.env.ADMIN_SESSION_SECRET
  process.env.ADMIN_SESSION_SECRET = "s".repeat(32)
  try {
    const response = await middleware(
      new NextRequest("http://admin.local/simulations"),
    )
    assert.equal(response.status, 307)
    assert.equal(response.headers.get("location"), "http://admin.local/login")
  } finally {
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
    else process.env.ADMIN_SESSION_SECRET = previousSecret
  }
})
