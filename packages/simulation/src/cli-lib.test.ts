import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { REGRESSION_SEEDS, SCENARIOS } from "./config.ts"
import {
  compareRunFiles,
  parseCliArgs,
  runRegressionMatrix,
  writePairArtifacts,
} from "./cli-lib.ts"
import { runSimulationPair } from "./comparison.ts"

test("parseCliArgs separates a command, flags, and boolean switches", () => {
  assert.deepEqual(
    parseCliArgs([
      "run",
      "--seed",
      "20260714",
      "--scenario=CONTINUOUS_RAIN",
      "--compact",
    ]),
    {
      command: "run",
      flags: { seed: "20260714", scenario: "CONTINUOUS_RAIN", compact: true },
    },
  )
})

test("regression matrix covers five fixed seeds and all eight scenarios reproducibly", () => {
  const config = { adoptionCount: 5, treeCount: 5 }
  const first = runRegressionMatrix(config)
  const second = runRegressionMatrix(config)
  assert.equal(first.length, REGRESSION_SEEDS.length * SCENARIOS.length)
  assert.deepEqual(first, second)
  assert.deepEqual(
    new Set(first.map((row) => row.seed)),
    new Set(REGRESSION_SEEDS),
  )
  assert.deepEqual(
    new Set(first.map((row) => row.scenario)),
    new Set(SCENARIOS),
  )
  assert.ok(first.every((row) => row.v0WorldHash === row.v1WorldHash))
})

test("writePairArtifacts writes the exact eleven artifacts below the comparison id", async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "simulation-artifacts-"))
  const pair = runSimulationPair({ adoptionCount: 10, treeCount: 10 })
  const result = await writePairArtifacts(pair, outputRoot)

  assert.equal(result.files.length, 11)
  assert.equal(result.directory, join(outputRoot, result.comparison.id))
  const report = await readFile(
    join(result.directory, "simulation_report.md"),
    "utf8",
  )
  assert.match(report, /Demo/)
  assert.match(report, /不代表真实/)
})

test("compareRunFiles compares specified serialized runs and rejects mismatched worlds", async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "simulation-runs-"))
  const normal = runSimulationPair({ adoptionCount: 10, treeCount: 10 })
  const rainy = runSimulationPair({
    adoptionCount: 10,
    treeCount: 10,
    scenario: "CONTINUOUS_RAIN",
  })
  const v0Path = join(outputRoot, "v0.json")
  const v1Path = join(outputRoot, "v1.json")
  await writeFile(v0Path, JSON.stringify(normal.v0))
  await writeFile(v1Path, JSON.stringify(normal.v1))

  const comparison = await compareRunFiles(v0Path, v1Path)
  assert.equal(comparison.worldHash, normal.world.worldHash)

  await writeFile(v1Path, JSON.stringify(rainy.v1))
  await assert.rejects(compareRunFiles(v0Path, v1Path), /same worldHash/)
})
