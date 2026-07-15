import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import type { ScenarioId, SimulationConfig } from "@zouma/contracts"

import {
  DEFAULT_SIMULATION_CONFIG,
  SCENARIOS,
  validateSimulationConfig,
} from "./config.ts"
import { compareSimulationRuns, runSimulationPair } from "./comparison.ts"
import {
  compareRunFiles,
  parseCliArgs,
  runRegressionMatrix,
  writePairArtifacts,
} from "./cli-lib.ts"

const HELP = `认养一棵树规则模拟 CLI

命令：
  run         单次 V0/V1 成对运行
  regression  五个固定种子 × 八个场景批量回归
  compare     比较两个已序列化的运行文件
  export      运行一组成对模拟并导出 11 类文件

示例：
  pnpm simulation:run --seed 20260713 --scenario NORMAL
  pnpm simulation:regression --output outputs/simulation/regression-summary.json
  pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json
  pnpm simulation:export --seed 20260713 --scenario NORMAL
`

function stringFlag(
  flags: Record<string, string | boolean>,
  name: string,
): string | undefined {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

function simulationConfig(
  flags: Record<string, string | boolean>,
): Partial<SimulationConfig> {
  const seedText = stringFlag(flags, "seed")
  const scenarioText = stringFlag(flags, "scenario")
  if (scenarioText && !SCENARIOS.includes(scenarioText as ScenarioId)) {
    throw new Error(`Unsupported scenario: ${scenarioText}`)
  }
  const config: Partial<SimulationConfig> = {
    seed:
      seedText === undefined
        ? DEFAULT_SIMULATION_CONFIG.seed
        : Number(seedText),
    scenario: (scenarioText ??
      DEFAULT_SIMULATION_CONFIG.scenario) as ScenarioId,
  }
  const validation = validateSimulationConfig(config)
  if (!validation.valid) throw new Error(validation.errors.join("; "))
  return config
}

async function emit(value: unknown, output?: string): Promise<void> {
  const contents = `${JSON.stringify(value, null, 2)}\n`
  if (output) {
    const path = resolve(output)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents, "utf8")
    process.stdout.write(`${path}\n`)
    return
  }
  process.stdout.write(contents)
}

async function main(): Promise<void> {
  const { command, flags } = parseCliArgs(process.argv.slice(2))
  if (command === "help" || flags.help === true) {
    process.stdout.write(HELP)
    return
  }
  if (command === "run") {
    const pair = runSimulationPair(simulationConfig(flags))
    await emit(
      { pair, comparison: compareSimulationRuns(pair.v0, pair.v1) },
      stringFlag(flags, "output"),
    )
    return
  }
  if (command === "regression") {
    await emit(
      {
        dataOrigin: "simulation",
        disclaimer: "模拟运营数据，不代表真实业务结果",
        generatedFromFixedSeeds: true,
        results: runRegressionMatrix(),
      },
      stringFlag(flags, "output") ??
        "outputs/simulation/regression-summary.json",
    )
    return
  }
  if (command === "compare") {
    const v0 = stringFlag(flags, "v0")
    const v1 = stringFlag(flags, "v1")
    if (!v0 || !v1) throw new Error("compare requires --v0 and --v1 JSON files")
    await emit(
      await compareRunFiles(resolve(v0), resolve(v1)),
      stringFlag(flags, "output"),
    )
    return
  }
  if (command === "export") {
    const result = await writePairArtifacts(
      runSimulationPair(simulationConfig(flags)),
      resolve(stringFlag(flags, "output-root") ?? "outputs/simulation"),
    )
    await emit(result)
    return
  }
  throw new Error(`Unknown command: ${command}\n\n${HELP}`)
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
})
