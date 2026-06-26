import assert from "node:assert/strict"
import test from "node:test"

import { createVillagerToken, getVillagerIdFromToken } from "./villager-auth"

test("creates a JWT token that resolves to the villager id", async () => {
  process.env.JWT_SECRET = "test-secret"
  const token = await createVillagerToken("villager-1")
  const request = new Request("http://localhost", {
    headers: { "X-Villager-Token": token },
  })

  assert.equal(await getVillagerIdFromToken(request), "villager-1")
})

test("rejects missing and malformed villager tokens", async () => {
  process.env.JWT_SECRET = "test-secret"

  assert.equal(
    await getVillagerIdFromToken(new Request("http://localhost")),
    null,
  )
  assert.equal(
    await getVillagerIdFromToken(
      new Request("http://localhost", {
        headers: { "X-Villager-Token": "invalid" },
      }),
    ),
    null,
  )
})
