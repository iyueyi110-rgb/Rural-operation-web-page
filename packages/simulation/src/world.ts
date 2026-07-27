import type {
  SimulationAdoption,
  SimulationConfig,
  SimulationReviewer,
  SimulationTaskSeed,
  SimulationTaskType,
  SimulationTree,
  SimulationVillager,
  SimulationVillagerAvailabilitySnapshot,
  SimulationWeatherDay,
  SimulationWorld,
} from "@zouma/contracts"

import {
  normalizeSimulationConfig,
  scenarioSnapshot,
  validateSimulationConfig,
} from "./config.ts"
import { addDays, addHours, keyedRandom, stableHash } from "./deterministic.ts"

const TASK_TYPES: SimulationTaskType[] = [
  "watering",
  "fertilizing",
  "pest_inspection",
  "growth_photo",
  "tree_health_record",
  "fruit_inspection",
  "harvest",
  "packing",
  "shipping",
  "onsite_reception",
]

function zoneFor(
  seed: number,
  id: string,
  remoteRatio: number,
): SimulationTree["zone"] {
  const roll = keyedRandom(seed, id, "zone")
  if (roll < remoteRatio) return "remote"
  if (roll < remoteRatio + (1 - remoteRatio) / 2) return "mid"
  return "near"
}

function taskTypeFor(
  config: SimulationConfig,
  adoptionId: string,
  index: number,
  harvestRatio: number,
): SimulationTaskType {
  const roll = keyedRandom(config.seed, `${adoptionId}:${index}`, "task-type")
  if (config.scenario === "HARVEST_PEAK" && roll < harvestRatio) {
    return ["harvest", "packing", "shipping"][index % 3] as SimulationTaskType
  }
  return TASK_TYPES[Math.floor(roll * TASK_TYPES.length)] ?? "watering"
}

export function generateSimulationWorld(
  input: Partial<SimulationConfig> = {},
): SimulationWorld {
  const config = normalizeSimulationConfig(input)
  const validation = validateSimulationConfig(config)
  if (!validation.valid)
    throw new Error(
      `Invalid simulation config: ${validation.errors.join("; ")}`,
    )
  const snapshot = scenarioSnapshot(config.scenario)
  const adoptionCount = Math.round(
    config.adoptionCount * snapshot.adoptionMultiplier,
  )

  const trees: SimulationTree[] = Array.from(
    { length: config.treeCount },
    (_, index) => {
      const id = `tree_${String(index + 1).padStart(4, "0")}`
      return {
        id,
        zone: zoneFor(config.seed, id, snapshot.remoteZoneRatio),
        healthScore: Number(
          (0.65 + keyedRandom(config.seed, id, "health") * 0.35).toFixed(4),
        ),
      }
    },
  )
  const adoptions: SimulationAdoption[] = Array.from(
    { length: adoptionCount },
    (_, index) => ({
      id: `adoption_${String(index + 1).padStart(4, "0")}`,
      treeId: index < trees.length ? trees[index]!.id : undefined,
      status: index < trees.length ? "active" : "created",
      createdAt: addHours(config.startAt, index % 72),
    }),
  )
  const unavailableVillagerCount =
    snapshot.unavailableVillagers < 1
      ? Math.round(config.villagerCount * snapshot.unavailableVillagers)
      : Math.round(snapshot.unavailableVillagers)
  const villagers: SimulationVillager[] = Array.from(
    { length: config.villagerCount },
    (_, index) => {
      const id = `villager_${String(index + 1).padStart(3, "0")}`
      const skillOffset = Math.floor(
        keyedRandom(config.seed, id, "skills") * TASK_TYPES.length,
      )
      const historicalAcceptanceRate = Number(
        (
          0.5 +
          keyedRandom(config.seed, id, "history-acceptance") * 0.49
        ).toFixed(4),
      )
      const historicalOnTimeRate = Number(
        (0.5 + keyedRandom(config.seed, id, "history-on-time") * 0.49).toFixed(
          4,
        ),
      )
      const historicalFirstPassRate = Number(
        (
          0.5 +
          keyedRandom(config.seed, id, "history-first-pass") * 0.49
        ).toFixed(4),
      )
      return {
        id,
        skills: [0, 1, 2].map(
          (offset) => TASK_TYPES[(skillOffset + offset) % TASK_TYPES.length]!,
        ),
        zone: zoneFor(config.seed, id, 0.2),
        dailyCapacity:
          3 + Math.floor(keyedRandom(config.seed, id, "capacity") * 4),
        reliability: Number(
          (
            (historicalAcceptanceRate +
              historicalOnTimeRate +
              historicalFirstPassRate) /
            3
          ).toFixed(4),
        ),
        historicalAcceptanceRate,
        historicalOnTimeRate,
        historicalFirstPassRate,
        available: index >= unavailableVillagerCount,
      }
    },
  )
  const reviewers: SimulationReviewer[] = Array.from(
    { length: config.reviewerCount },
    (_, index) => ({
      id: `reviewer_${String(index + 1).padStart(3, "0")}`,
      dailyCapacity:
        20 +
        Math.floor(
          keyedRandom(config.seed, `reviewer_${index + 1}`, "capacity") * 11,
        ),
      available: index >= snapshot.unavailableReviewers,
    }),
  )
  const villagerAvailability: SimulationVillagerAvailabilitySnapshot[] =
    villagers.flatMap((villager) =>
      Array.from({ length: config.durationDays }, (_, index) => {
        const date = addDays(config.startAt, index).slice(0, 10)
        const attendanceScore = Number(
          keyedRandom(
            config.seed,
            `${villager.id}:${date}`,
            "attendance",
          ).toFixed(4),
        )
        const availabilityScore = Number(
          keyedRandom(
            config.seed,
            `${villager.id}:${date}`,
            "availability",
          ).toFixed(4),
        )
        return {
          villagerId: villager.id,
          date,
          attendanceScore,
          availabilityScore,
          available: villager.available && attendanceScore >= 0.01,
        }
      }),
    )
  const weather: SimulationWeatherDay[] = Array.from(
    { length: config.durationDays },
    (_, index) => {
      const roll = keyedRandom(config.seed, `day_${index}`, "weather")
      let condition: SimulationWeatherDay["condition"] =
        roll < 0.12 ? "rain" : roll < 0.42 ? "cloudy" : "clear"
      if (
        config.weatherEnabled &&
        config.scenario === "CONTINUOUS_RAIN" &&
        index >= 8 &&
        index < 13
      )
        condition = "heavy_rain"
      return { day: index + 1, date: addDays(config.startAt, index), condition }
    },
  )
  const treeById = new Map(trees.map((tree) => [tree.id, tree]))
  const tasks: SimulationTaskSeed[] = []
  for (const adoption of adoptions) {
    if (adoption.status !== "active" || !adoption.treeId) continue
    const span = config.tasksPerAdoption.max - config.tasksPerAdoption.min + 1
    const taskCount =
      config.tasksPerAdoption.min +
      Math.floor(keyedRandom(config.seed, adoption.id, "task-count") * span)
    for (let index = 0; index < taskCount; index += 1) {
      const id = `task_${adoption.id.slice(-4)}_${index + 1}`
      const createdAt = addHours(adoption.createdAt, 12 + index * 36)
      const difficulty = keyedRandom(config.seed, id, "difficulty")
      tasks.push({
        id,
        adoptionId: adoption.id,
        treeId: adoption.treeId,
        taskType: taskTypeFor(
          config,
          adoption.id,
          index,
          snapshot.harvestTaskRatio,
        ),
        zone: treeById.get(adoption.treeId)!.zone,
        priority: difficulty > 0.8 ? 3 : difficulty > 0.45 ? 2 : 1,
        createdAt,
        dueAt: addHours(createdAt, 48 + Math.floor(difficulty * 73)),
        acceptRoll: keyedRandom(config.seed, id, "accept"),
        qualityRoll: keyedRandom(config.seed, id, "quality"),
        anomalyRoll: keyedRandom(config.seed, id, "anomaly"),
        clarityRoll: keyedRandom(config.seed, id, "clarity"),
        duplicateRoll: keyedRandom(config.seed, id, "duplicate"),
        executionHours:
          8 + keyedRandom(config.seed, id, "execution-hours") * 112,
        reviewHours: 1 + keyedRandom(config.seed, id, "review-hours") * 23,
      })
    }
  }
  const unhashed = {
    dataOrigin: "simulation" as const,
    seed: config.seed,
    config,
    scenarioSnapshot: snapshot,
    trees,
    adoptions,
    villagers,
    villagerAvailability,
    reviewers,
    weather,
    tasks,
  }
  return { ...unhashed, worldHash: stableHash(unhashed) }
}
