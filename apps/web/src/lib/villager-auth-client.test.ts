import assert from "node:assert/strict"
import test from "node:test"

import { readVillagerToken } from "./villager-auth-client"

test("reads the stored villager token without client-side decoding", () => {
  const storage = {
    getItem: (key: string) => (key === "villager_token" ? "jwt-token" : null),
  }

  assert.equal(readVillagerToken(storage), "jwt-token")
})
