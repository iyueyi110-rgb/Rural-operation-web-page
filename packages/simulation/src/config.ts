import type {
  ScenarioId,
  SimulationConfig,
  SimulationScenarioSnapshot,
  SimulationValidationResult,
} from "@zouma/contracts"

const PRISMA_INT32_MIN = -2_147_483_648
const PRISMA_INT32_MAX = 2_147_483_647

export const REGRESSION_SEEDS = Object.freeze([
  20260713, 20260714, 20260715, 20260716, 20260717,
])
export const SIMULATION_LIMITS = Object.freeze({
  durationDays: 365,
  adoptionCount: 1000,
  treeCount: 2000,
  villagerCount: 500,
  reviewerCount: 100,
  tasksPerAdoption: 10,
  peakOrders: 1600,
  estimatedEvents: 150000,
})

export const SCENARIOS = Object.freeze([
  "NORMAL",
  "ADOPTION_PEAK",
  "STAFF_SHORTAGE",
  "CONTINUOUS_RAIN",
  "LOW_SUBMISSION_QUALITY",
  "REMOTE_ZONE_LOAD",
  "REVIEW_BACKLOG",
  "HARVEST_PEAK",
] satisfies ScenarioId[])

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = Object.freeze({
  seed: 20260713,
  durationDays: 30,
  adoptionCount: 100,
  treeCount: 100,
  villagerCount: 20,
  reviewerCount: 3,
  tasksPerAdoption: Object.freeze({ min: 3, max: 5 }),
  scenario: "NORMAL",
  startAt: "2026-07-13T00:00:00.000Z",
  weatherEnabled: true,
  anomalyEnabled: true,
})

export function normalizeSimulationConfig(
  input: Partial<SimulationConfig> = {},
): SimulationConfig {
  return {
    ...DEFAULT_SIMULATION_CONFIG,
    ...input,
    tasksPerAdoption: {
      ...DEFAULT_SIMULATION_CONFIG.tasksPerAdoption,
      ...input.tasksPerAdoption,
    },
  }
}

export function validateSimulationConfig(
  input: Partial<SimulationConfig>,
): SimulationValidationResult {
  const config = normalizeSimulationConfig(input)
  const errors: string[] = []
  for (const key of [
    "durationDays",
    "adoptionCount",
    "treeCount",
    "villagerCount",
    "reviewerCount",
  ] as const) {
    if (!Number.isInteger(config[key]) || config[key] <= 0)
      errors.push(`${key} must be a positive integer`)
  }
  for (const key of [
    "durationDays",
    "adoptionCount",
    "treeCount",
    "villagerCount",
    "reviewerCount",
  ] as const) {
    if (config[key] > SIMULATION_LIMITS[key])
      errors.push(`${key} exceeds safe limit ${SIMULATION_LIMITS[key]}`)
  }
  if (!Number.isInteger(config.seed)) errors.push("seed must be an integer")
  else if (config.seed < PRISMA_INT32_MIN || config.seed > PRISMA_INT32_MAX)
    errors.push(
      `seed must be between ${PRISMA_INT32_MIN} and ${PRISMA_INT32_MAX}`,
    )
  if (
    !Number.isInteger(config.tasksPerAdoption.min) ||
    config.tasksPerAdoption.min < 0
  )
    errors.push("tasksPerAdoption.min must be a non-negative integer")
  if (
    !Number.isInteger(config.tasksPerAdoption.max) ||
    config.tasksPerAdoption.max < config.tasksPerAdoption.min
  )
    errors.push("tasksPerAdoption.max must be greater than or equal to min")
  if (config.tasksPerAdoption.max > SIMULATION_LIMITS.tasksPerAdoption)
    errors.push("tasksPerAdoption.max exceeds safe limit")
  const peakOrders = Math.ceil(
    config.adoptionCount * (config.scenario === "ADOPTION_PEAK" ? 1.8 : 1),
  )
  if (peakOrders > SIMULATION_LIMITS.peakOrders)
    errors.push("estimated peak orders exceed safe limit")
  if (
    peakOrders * config.tasksPerAdoption.max * 20 >
    SIMULATION_LIMITS.estimatedEvents
  )
    errors.push("estimated events exceed safe limit")
  if (!SCENARIOS.includes(config.scenario))
    errors.push("scenario must be one of the eight supported scenarios")
  if (Number.isNaN(new Date(config.startAt).getTime()))
    errors.push("startAt must be a valid ISO date")
  return { valid: errors.length === 0, errors }
}

export function scenarioSnapshot(id: ScenarioId): SimulationScenarioSnapshot {
  const common: SimulationScenarioSnapshot = {
    id,
    adoptionMultiplier: 1,
    unavailableVillagers: 0,
    unavailableReviewers: 0,
    heavyRainDays: 0,
    qualityPenalty: 0,
    remoteZoneRatio: 0.2,
    reviewDelayMultiplier: 1,
    harvestTaskRatio: 0.15,
  }
  switch (id) {
    case "ADOPTION_PEAK":
      return { ...common, adoptionMultiplier: 1.8 }
    case "STAFF_SHORTAGE":
      return { ...common, unavailableVillagers: 0.3, unavailableReviewers: 1 }
    case "CONTINUOUS_RAIN":
      return { ...common, heavyRainDays: 5 }
    case "LOW_SUBMISSION_QUALITY":
      return { ...common, qualityPenalty: 0.25 }
    case "REMOTE_ZONE_LOAD":
      return { ...common, remoteZoneRatio: 0.7 }
    case "REVIEW_BACKLOG":
      return { ...common, reviewDelayMultiplier: 2.2 }
    case "HARVEST_PEAK":
      return { ...common, harvestTaskRatio: 0.7 }
    default:
      return common
  }
}
