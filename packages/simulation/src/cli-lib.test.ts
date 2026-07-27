import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isAbsolute, join, resolve } from "node:path"
import test from "node:test"
import { promisify } from "node:util"

import { REGRESSION_SEEDS, SCENARIOS } from "./config.ts"
import {
  compareRunFiles,
  parseCliArgs,
  resolveCliPath,
  runRegressionMatrix,
  writePairArtifacts,
} from "./cli-lib.ts"
import { runSimulationPair } from "./comparison.ts"

const execFileAsync = promisify(execFile)

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

test("resolveCliPath uses the invocation directory and preserves absolute paths", () => {
  const invocationCwd = resolve(tmpdir(), "simulation-caller")
  const relative = resolveCliPath("outputs/pair.json", invocationCwd)
  const absolute = resolve(tmpdir(), "absolute-pair.json")

  assert.equal(relative, resolve(invocationCwd, "outputs/pair.json"))
  assert.equal(resolveCliPath(absolute, invocationCwd), absolute)
  assert.ok(isAbsolute(relative))
})

test("CLI writes relative output below the explicit caller directory", async () => {
  const callerDirectory = await mkdtemp(join(tmpdir(), "simulation-caller-"))
  const output = join(callerDirectory, "nested", "pair.json")

  await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/cli.ts",
      "run",
      "--cwd",
      callerDirectory,
      "--output",
      "nested/pair.json",
      "--seed",
      "20260713",
      "--scenario",
      "NORMAL",
    ],
    { cwd: resolve(import.meta.dirname, "..") },
  )

  const parsed = JSON.parse(await readFile(output, "utf8")) as {
    pair?: { v0?: { worldHash?: string }; v1?: { worldHash?: string } }
  }
  assert.equal(parsed.pair?.v0?.worldHash, parsed.pair?.v1?.worldHash)
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
