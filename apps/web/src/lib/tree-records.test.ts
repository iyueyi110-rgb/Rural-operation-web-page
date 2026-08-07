import assert from "node:assert/strict"
import test from "node:test"

import { normalizeTreeCode } from "./trees-data"

test("normalizes formatted and database tree codes to one lookup key", () => {
  assert.equal(normalizeTreeCode("LZ-018"), "lz018")
  assert.equal(normalizeTreeCode("lz-018"), "lz018")
  assert.equal(normalizeTreeCode(" lz018 "), "lz018")
})

test("keeps unrelated tree codes distinct", () => {
  assert.notEqual(normalizeTreeCode("LZ-018"), normalizeTreeCode("LZ-026"))
})
