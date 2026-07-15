import assert from "node:assert/strict"
import test from "node:test"

import {
  AdminLoginRateLimiter,
  BoundedAdminLoginFailureStore,
} from "./admin-login-rate-limit.server"
import { createAdminSessionHandler } from "./admin-session-handler.server"

function loginRequest(password: string, headers: Record<string, string> = {}) {
  return new Request("http://admin.local/api/admin/session", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams({ password }),
  })
}

function loginHarness(
  options: {
    clientLimit?: number
    globalLimit?: number
    windowMs?: number
    maxClients?: number
  } = {},
) {
  let now = 1_000
  const delays: number[] = []
  const store = new BoundedAdminLoginFailureStore(options.maxClients ?? 16)
  const limiter = new AdminLoginRateLimiter(store, {
    clientLimit: options.clientLimit ?? 3,
    clientWindowMs: options.windowMs ?? 10_000,
    globalLimit: options.globalLimit ?? 100,
    globalWindowMs: options.windowMs ?? 10_000,
  })
  const post = createAdminSessionHandler({
    expectedPassword: "correct-password",
    sessionSecret: "s".repeat(32),
    limiter,
    minimumDelayMs: 250,
    now: () => now,
    sleep: async (milliseconds) => {
      delays.push(milliseconds)
    },
  })
  return {
    delays,
    limiter,
    post,
    setNow(value: number) {
      now = value
    },
    store,
  }
}

test("consecutive login failures return 429 with Retry-After", async () => {
  const harness = loginHarness({ clientLimit: 3 })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
  }
  const blocked = await harness.post(loginRequest("wrong"))

  assert.equal(blocked.status, 429)
  assert.equal(blocked.headers.get("retry-after"), "10")
  assert.deepEqual(harness.delays, [250, 250, 250])
})

test("concurrent login bursts cannot pass the failure limit before comparisons finish", async () => {
  const harness = loginHarness({ clientLimit: 2 })

  const responses = await Promise.all(
    Array.from({ length: 6 }, () => harness.post(loginRequest("wrong"))),
  )

  assert.deepEqual(
    responses.map((response) => response.status),
    [401, 401, 429, 429, 429, 429],
  )
})

test("login failure windows recover after their reset time", async () => {
  const harness = loginHarness({ clientLimit: 1, windowMs: 2_000 })
  assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
  assert.equal((await harness.post(loginRequest("wrong"))).status, 429)

  harness.setNow(3_001)

  assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
})

test("success clears the client bucket but cannot clear the global failures", async () => {
  const harness = loginHarness({ clientLimit: 20, globalLimit: 3 })
  assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
  assert.equal(
    (await harness.post(loginRequest("correct-password"))).status,
    303,
  )
  assert.equal(harness.store.clientFailureCount("unattributed", 1_000), 0)
  assert.equal(harness.store.globalFailureCount(1_000), 1)

  assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
  assert.equal((await harness.post(loginRequest("wrong"))).status, 401)
  assert.equal(
    (await harness.post(loginRequest("correct-password"))).status,
    429,
  )
})

test("forged X-Forwarded-For values cannot rotate the client bucket", async () => {
  const harness = loginHarness({ clientLimit: 2 })
  assert.equal(
    (
      await harness.post(
        loginRequest("wrong", { "x-forwarded-for": "198.51.100.1" }),
      )
    ).status,
    401,
  )
  assert.equal(
    (
      await harness.post(
        loginRequest("wrong", { "x-forwarded-for": "198.51.100.2" }),
      )
    ).status,
    401,
  )
  assert.equal(
    (
      await harness.post(
        loginRequest("wrong", { "x-forwarded-for": "198.51.100.3" }),
      )
    ).status,
    429,
  )
})

test("the in-memory store bounds client buckets without evicting global state", () => {
  const store = new BoundedAdminLoginFailureStore(2)
  const limiter = new AdminLoginRateLimiter(store, {
    clientLimit: 10,
    clientWindowMs: 10_000,
    globalLimit: 10,
    globalWindowMs: 10_000,
  })

  limiter.recordFailure("client-a", 1_000)
  limiter.recordFailure("client-b", 1_001)
  limiter.recordFailure("client-c", 1_002)

  assert.equal(store.clientSize, 2)
  assert.equal(store.hasClient("client-a", 1_002), false)
  assert.equal(store.hasClient("client-b", 1_002), true)
  assert.equal(store.hasClient("client-c", 1_002), true)
  assert.equal(store.globalFailureCount(1_002), 3)
})
