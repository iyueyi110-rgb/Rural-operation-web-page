import assert from "node:assert/strict"
import test from "node:test"

import { createJWT, getBearerToken, verifyJWT } from "./auth-jwt"

test("creates and verifies a seven-day visitor JWT", async () => {
  const now = Date.UTC(2026, 5, 20)
  const token = await createJWT({ userId: "user-1", role: "visitor" }, "salt-1", now)

  assert.deepEqual(await verifyJWT(token, now + 1_000), {
    userId: "user-1",
    role: "visitor",
    salt: "salt-1",
  })
  assert.equal(await verifyJWT(token, now + 8 * 24 * 60 * 60 * 1_000), null)
})

test("rejects malformed JWTs and parses a Bearer header", async () => {
  assert.equal(await verifyJWT("not-a-jwt"), null)
  assert.equal(
    getBearerToken(new Request("http://localhost", { headers: { Authorization: "Bearer abc" } })),
    "abc",
  )
  assert.equal(getBearerToken(new Request("http://localhost")), null)
})
