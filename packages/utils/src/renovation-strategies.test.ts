import assert from "node:assert/strict"
import test from "node:test"

import { matchStrategies } from "./renovation-strategies"

test("matches structural failure to full demolish rebuild", () => {
  assert.equal(matchStrategies(["D1_STRUCTURAL_FAILURE"])[0]?.code, "REN-DN-001")
})

test("matches low-value redevelopment to partial demolish rebuild", () => {
  assert.equal(matchStrategies(["D2_LOW_VALUE_REDEVELOP"])[0]?.code, "REN-DN-002")
})

test("matches capacity overflow to new construction", () => {
  assert.equal(matchStrategies(["N1_CAPACITY_OVERFLOW"])[0]?.code, "REN-DN-003")
})
