import assert from "node:assert/strict"
import test from "node:test"

import { createVillagerToken, getVillagerIdFromToken } from "./villager-auth"

test("creates a token that resolves to the villager id", () => {
  const now = Date.now()
  const token = createVillagerToken("villager-1", now)
  const request = new Request("http://localhost", {
    headers: { "X-Villager-Token": token },
  })

  assert.equal(getVillagerIdFromToken(request, now), "villager-1")
})

test("rejects malformed and expired villager tokens", () => {
  const now = Date.now()
  const expired = createVillagerToken("villager-1", now - 7 * 24 * 60 * 60 * 1000 - 1)

  assert.equal(getVillagerIdFromToken(new Request("http://localhost"), now), null)
  assert.equal(
    getVillagerIdFromToken(
      new Request("http://localhost", { headers: { "X-Villager-Token": "invalid" } }),
      now,
    ),
    null,
  )
  assert.equal(
    getVillagerIdFromToken(
      new Request("http://localhost", { headers: { "X-Villager-Token": expired } }),
      now,
    ),
    null,
  )
})
