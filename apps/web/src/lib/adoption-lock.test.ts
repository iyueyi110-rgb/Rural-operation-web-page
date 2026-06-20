import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAdoptionLockKey,
  createAdoptionLockValue,
  isRedisUnavailableError,
} from "./adoption-lock"

test("builds a stable per-tree adoption lock key", () => {
  assert.equal(buildAdoptionLockKey("tree-018"), "adoption_lock:tree-018")
})

test("creates a lock value tied to the requester and timestamp", () => {
  assert.equal(createAdoptionLockValue("user-1", 1_750_000_000_000), "user-1_1750000000000")
})

test("classifies Redis connection failures for graceful fallback", () => {
  assert.equal(isRedisUnavailableError(new Error("ECONNREFUSED localhost:6379")), true)
  assert.equal(isRedisUnavailableError(new Error("business validation failed")), false)
})
