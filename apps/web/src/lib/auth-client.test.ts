import assert from "node:assert/strict"
import test from "node:test"

import { buildAuthHeaders, readAuthToken, resolveTouristRecipientId } from "./auth-client"

test("reads the visitor token from storage", () => {
  const storage = { getItem: (key: string) => (key === "auth_token" ? "jwt-token" : null) }
  assert.equal(readAuthToken(storage), "jwt-token")
})

test("injects the Bearer token without dropping existing headers", () => {
  const headers = buildAuthHeaders("jwt-token", { "Content-Type": "application/json" })
  assert.equal(headers.get("Authorization"), "Bearer jwt-token")
  assert.equal(headers.get("Content-Type"), "application/json")
})

test("prefers JWT user id and falls back to the legacy phone", () => {
  assert.equal(resolveTouristRecipientId("user-1", "13800000000"), "user-1")
  assert.equal(resolveTouristRecipientId(null, "13800000000"), "13800000000")
})
