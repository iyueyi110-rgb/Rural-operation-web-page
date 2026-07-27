import assert from "node:assert/strict"
import test from "node:test"

import packageJson from "../package.json" with { type: "json" }

test("declares the fetchWithTimeout package subpath export", () => {
  assert.equal(packageJson.exports["./fetch-timeout"], "./src/fetch-timeout.ts")
})

test("declares renovation package subpath exports", () => {
  assert.equal(packageJson.exports["./diagnosis-engine"], "./src/diagnosis-engine.ts")
  assert.equal(packageJson.exports["./renovation-strategies"], "./src/renovation-strategies.ts")
})
