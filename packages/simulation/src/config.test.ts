import assert from "node:assert/strict"
import test from "node:test"

import { validateSimulationConfig } from "./config.ts"

const PRISMA_INT32_MIN = -2_147_483_648
const PRISMA_INT32_MAX = 2_147_483_647

test("seed accepts the complete Prisma Int32 range", () => {
  assert.equal(validateSimulationConfig({ seed: PRISMA_INT32_MIN }).valid, true)
  assert.equal(validateSimulationConfig({ seed: PRISMA_INT32_MAX }).valid, true)
})

test("seed rejects integers outside the Prisma Int32 range", () => {
  for (const seed of [PRISMA_INT32_MIN - 1, PRISMA_INT32_MAX + 1]) {
    const validation = validateSimulationConfig({ seed })
    assert.equal(validation.valid, false)
    assert.ok(
      validation.errors.includes(
        `seed must be between ${PRISMA_INT32_MIN} and ${PRISMA_INT32_MAX}`,
      ),
    )
  }
})
