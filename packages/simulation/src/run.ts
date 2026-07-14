import type {
  PolicyVersion,
  SimulationRun,
  SimulationWorld,
} from "@zouma/contracts"

import { runCausalSimulation } from "./causal-engine.ts"

export interface RunSimulationOptions {
  simulationRunId?: string
  policyRevision?: string
  pairId?: string
}

/** Public entrypoint for the callback-driven discrete-event simulation. */
export function runSimulation(
  world: SimulationWorld,
  policyVersion: PolicyVersion,
  options: RunSimulationOptions = {},
): SimulationRun {
  return runCausalSimulation(world, policyVersion, options)
}
