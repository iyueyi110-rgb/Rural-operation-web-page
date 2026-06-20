import assert from "node:assert/strict"
import test from "node:test"

import { decodeVillagerToken } from "./villager-auth-client"

test("decodes a valid client token and rejects expired tokens", () => {
  const now = Date.now()
  const encode = (value: string) => Buffer.from(value, "utf-8").toString("base64")

  assert.deepEqual(decodeVillagerToken(`villager_${encode(`v1_${now}`)}`, now), {
    id: "v1",
    timestamp: now,
  })
  assert.equal(
    decodeVillagerToken(
      `villager_${encode(`v1_${now - 7 * 24 * 60 * 60 * 1000 - 1}`)}`,
      now,
    ),
    null,
  )
})
