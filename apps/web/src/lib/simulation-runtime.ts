import {
  compareSimulationRuns,
  exportSimulationArtifacts,
  generateSimulationWorld,
  runSimulation,
  validateSimulationConfig,
} from "@zouma/simulation"

import { createSimulationRepository } from "@web/lib/simulation-repository"
import {
  createSimulationService,
  type SimulationEngineAdapter,
} from "@web/lib/simulation-service"

const engine: SimulationEngineAdapter = {
  validateSimulationConfig,
  generateSimulationWorld,
  runSimulation: (world, policyVersion, options) =>
    runSimulation(world, policyVersion, options),
  compareSimulationRuns,
  exportSimulationArtifacts,
}

let servicePromise: ReturnType<typeof createService> | undefined

async function createService() {
  const repository = await createSimulationRepository()
  return createSimulationService({ repository, engine })
}

export function getSimulationService() {
  servicePromise ??= createService()
  return servicePromise
}
