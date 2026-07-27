import assert from "node:assert/strict"
import test from "node:test"

import { isMainlandMobile, normalizeMainlandMobile } from "./phone"

test("normalizes mainland mobile input before villager lookup", () => {
  assert.equal(normalizeMainlandMobile(" 138 0013-8000 "), "13800138000")
  assert.equal(isMainlandMobile("13800138000"), true)
  assert.equal(isMainlandMobile(normalizeMainlandMobile("138****8000")), false)
})
