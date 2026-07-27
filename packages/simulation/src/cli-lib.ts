import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import type {
  ScenarioId,
  SimulationComparison,
  SimulationConfig,
  SimulationRun,
  SimulationRunPair,
} from "@zouma/contracts"

import { REGRESSION_SEEDS, SCENARIOS } from "./config.ts"
import { compareSimulationRuns, runSimulationPair } from "./comparison.ts"
import { exportSimulationArtifacts } from "./export.ts"

export interface ParsedCliArgs {
  command: string
  flags: Record<string, string | boolean>
}

export interface RegressionSummary {
  pairId: string
  comparisonId: string
  seed: number
  scenario: ScenarioId
  v0RunId: string
  v1RunId: string
  v0WorldHash: string
  v1WorldHash: string
  recommendation: SimulationComparison["recommendation"]
}

export function resolveCliPath(
  value: string,
  invocationCwd = process.env.INIT_CWD ?? process.cwd(),
): string {
  return resolve(invocationCwd, value)
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [command = "help", ...tokens] = argv
  const flags: Record<string, string | boolean> = {}
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token.startsWith("--"))
      throw new Error(`Unexpected argument: ${token}`)
    const separator = token.indexOf("=")
    if (separator > 2) {
      flags[token.slice(2, separator)] = token.slice(separator + 1)
      continue
    }
    const key = token.slice(2)
    const next = tokens[index + 1]
    if (next && !next.startsWith("--")) {
      flags[key] = next
      index += 1
    } else {
      flags[key] = true
    }
  }
  return { command, flags }
}

function summarizePair(pair: SimulationRunPair): RegressionSummary {
  const comparison = compareSimulationRuns(pair.v0, pair.v1)
  return {
    pairId: pair.pairId,
    comparisonId: comparison.id,
    seed: pair.world.seed,
    scenario: pair.world.config.scenario,
    v0RunId: pair.v0.simulationRunId,
    v1RunId: pair.v1.simulationRunId,
    v0WorldHash: pair.v0.worldHash,
    v1WorldHash: pair.v1.worldHash,
    recommendation: comparison.recommendation,
  }
}

export function runRegressionMatrix(
  config: Partial<SimulationConfig> = {},
): RegressionSummary[] {
  return REGRESSION_SEEDS.flatMap((seed) =>
    SCENARIOS.map((scenario) =>
      summarizePair(runSimulationPair({ ...config, seed, scenario })),
    ),
  )
}

export async function compareRunFiles(
  v0Path: string,
  v1Path: string,
): Promise<SimulationComparison> {
  const [v0Text, v1Text] = await Promise.all([
    readFile(v0Path, "utf8"),
    readFile(v1Path, "utf8"),
  ])
  return compareSimulationRuns(
    JSON.parse(v0Text) as SimulationRun,
    JSON.parse(v1Text) as SimulationRun,
  )
}

export async function writePairArtifacts(
  pair: SimulationRunPair,
  outputRoot: string,
): Promise<{
  comparison: SimulationComparison
  directory: string
  files: string[]
}> {
  const comparison = compareSimulationRuns(pair.v0, pair.v1)
  const artifacts = exportSimulationArtifacts(pair, comparison)
  const directory = join(outputRoot, comparison.id)
  await mkdir(directory, { recursive: true })
  await Promise.all(
    Object.entries(artifacts).map(([name, contents]) =>
      writeFile(join(directory, name), contents, "utf8"),
    ),
  )
  return { comparison, directory, files: Object.keys(artifacts).sort() }
}
