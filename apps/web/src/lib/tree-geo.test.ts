import assert from "node:assert/strict"
import test from "node:test"

import { resolveTreeHiddenGeo, toGridId } from "./tree-geo"

test("maps nearby coordinates into a stable approximately 100m grid", () => {
  assert.equal(toGridId(29.85121, 106.32121), "网格_51_21")
  assert.equal(toGridId(29.85124, 106.32124), "网格_51_21")
  assert.equal(toGridId(29.85221, 106.32121), "网格_52_21")
})

test("prefers a persisted hidden grid and derives one only when coordinates are valid", () => {
  assert.equal(
    resolveTreeHiddenGeo("网格_走马岭_02", 29.85, 106.32),
    "网格_走马岭_02",
  )
  assert.equal(resolveTreeHiddenGeo(null, 29.85121, 106.32121), "网格_51_21")
  assert.equal(resolveTreeHiddenGeo(null, null, 106.32121), undefined)
})

test("rejects non-finite and out-of-range coordinates", () => {
  assert.throws(() => toGridId(Number.NaN, 106.32), /coordinates/i)
  assert.throws(() => toGridId(91, 106.32), /coordinates/i)
  assert.throws(() => toGridId(29.85, 181), /coordinates/i)
})
