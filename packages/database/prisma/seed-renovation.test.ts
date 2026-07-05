import assert from "node:assert/strict"
import test from "node:test"

import {
  RENOVATION_ASSESSMENTS,
  RENOVATION_STRATEGY_SEEDS,
  RENOVATION_TARGET_SLUGS,
} from "./seed-renovation"

test("renovation seed covers the six demo target nodes", () => {
  assert.deepEqual(RENOVATION_TARGET_SLUGS, [
    "ancient-road",
    "lychee-garden",
    "waterfront-rest",
    "ridge-courtyard",
    "village-meal",
    "tree-adoption",
  ])
  assert.equal(RENOVATION_ASSESSMENTS.length, 5)
})

test("renovation seed provides varied intervention types and priorities", () => {
  const interventionTypes = new Set(RENOVATION_STRATEGY_SEEDS.map((strategy) => strategy.interventionType))
  const priorities = new Set(RENOVATION_STRATEGY_SEEDS.map((strategy) => strategy.priority))

  assert.ok(interventionTypes.has("renovation"))
  assert.ok(interventionTypes.has("partial_demolish_rebuild"))
  assert.ok(interventionTypes.has("new_construction"))
  assert.ok(priorities.has("critical"))
})
