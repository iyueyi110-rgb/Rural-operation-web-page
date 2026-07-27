import assert from "node:assert/strict"
import test from "node:test"

import type {
  PolicyVersion,
  SimulationBadCase,
  SimulationComparison,
  SimulationConfig,
  SimulationEvent,
  SimulationExportArtifacts,
  SimulationMetric,
  SimulationMetricKey,
  SimulationRun,
  SimulationRunPair,
  SimulationWorld,
} from "@zouma/contracts"
import {
  compareSimulationRuns as compareActualRuns,
  exportSimulationArtifacts as exportActualArtifacts,
  generateSimulationWorld as generateActualWorld,
  runSimulation as runActualSimulation,
  validateSimulationConfig as validateActualConfig,
} from "@zouma/simulation"

import { createMemorySimulationRepository } from "./simulation-repository"
import {
  SimulationInputError,
  createSimulationService,
  type SimulationEngineAdapter,
} from "./simulation-service"

const config: SimulationConfig = {
  seed: 20260713,
  durationDays: 30,
  adoptionCount: 1,
  treeCount: 1,
  villagerCount: 1,
  reviewerCount: 1,
  tasksPerAdoption: { min: 1, max: 1 },
  scenario: "NORMAL",
  startAt: "2026-07-13T00:00:00.000Z",
  weatherEnabled: true,
  anomalyEnabled: true,
}

function makeWorld(seed = config.seed): SimulationWorld {
  return {
    dataOrigin: "simulation",
    seed,
    config: { ...config, seed },
    scenarioSnapshot: {
      id: "NORMAL",
      adoptionMultiplier: 1,
      unavailableVillagers: 0,
      unavailableReviewers: 0,
      heavyRainDays: 0,
      qualityPenalty: 0,
      remoteZoneRatio: 0.2,
      reviewDelayMultiplier: 1,
      harvestTaskRatio: 0.1,
    },
    trees: [{ id: "tree-1", zone: "near", healthScore: 90 }],
    adoptions: [
      {
        id: "adoption-1",
        treeId: "tree-1",
        status: "active",
        createdAt: config.startAt,
      },
    ],
    villagers: [
      {
        id: "villager-1",
        skills: ["watering"],
        zone: "near",
        dailyCapacity: 3,
        reliability: 0.9,
        historicalAcceptanceRate: 0.9,
        historicalOnTimeRate: 0.9,
        historicalFirstPassRate: 0.9,
        available: true,
      },
    ],
    villagerAvailability: [
      {
        villagerId: "villager-1",
        date: "2026-07-13",
        attendanceScore: 0.9,
        availabilityScore: 0.9,
        available: true,
      },
    ],
    reviewers: [{ id: "reviewer-1", dailyCapacity: 5, available: true }],
    weather: [{ day: 1, date: "2026-07-13", condition: "clear" }],
    tasks: [
      {
        id: "task-1",
        adoptionId: "adoption-1",
        treeId: "tree-1",
        taskType: "watering",
        zone: "near",
        priority: 1,
        createdAt: config.startAt,
        dueAt: "2026-07-14T00:00:00.000Z",
        acceptRoll: 0.1,
        qualityRoll: 0.1,
        anomalyRoll: 0.1,
        clarityRoll: 0.1,
        duplicateRoll: 0.1,
        executionHours: 1,
        reviewHours: 1,
      },
    ],
    worldHash: `world-${seed}`,
  }
}

const metricKeys: SimulationMetricKey[] = [
  "acceptance_rate",
  "on_time_submission_rate",
  "first_review_pass_rate",
  "final_review_pass_rate",
  "reassignment_rate",
  "overdue_rate",
  "average_acceptance_hours",
  "average_review_hours",
  "review_return_rate",
  "rights_on_time_fulfillment_rate",
  "anomaly_detection_rate",
  "assignment_fairness_cv",
  "manual_intervention_count",
]

function metrics(runId: string, policyVersion: PolicyVersion) {
  return Object.fromEntries(
    metricKeys.map((key) => [
      key,
      {
        key,
        numerator: 1,
        denominator: 1,
        value: 1,
        unit: key.includes("hours")
          ? "hours"
          : key.includes("count")
            ? "count"
            : "ratio",
        definition: key,
        dataOrigin: "simulation",
        simulationRunId: runId,
        policyVersion,
        policyRevision: "revision-1",
      },
    ]),
  ) as Record<SimulationMetricKey, SimulationMetric>
}

function makeRun(
  world: SimulationWorld,
  policyVersion: PolicyVersion,
  simulationRunId: string,
): SimulationRun {
  const provenance = {
    dataOrigin: "simulation" as const,
    simulationRunId,
    policyVersion,
    policyRevision: "revision-1",
  }
  const event: SimulationEvent = {
    ...provenance,
    id: `${simulationRunId}-event`,
    eventType: "TASK_ASSIGNED",
    scenarioId: "NORMAL",
    randomSeed: world.seed,
    entityType: "task",
    entityId: "task-1",
    occurredAt: "2026-07-13T01:00:00.000Z",
    adoptionId: "adoption-1",
    taskId: "task-1",
    actorId: "villager-1",
    actorType: "villager",
    fromStatus: "created",
    toStatus: "assigned",
    payload: { attempt: 1 },
  }
  const badCase: SimulationBadCase = {
    ...provenance,
    id: `${simulationRunId}-bad`,
    category: "assignment_exhausted",
    severity: "medium",
    adoptionId: "adoption-1",
    taskId: "task-1",
    title: "Repeated assignment",
    description: "Task needed another assignee",
    eventIds: [event.id],
  }
  return {
    ...provenance,
    pairId: "pair-fixed",
    worldHash: world.worldHash,
    seed: world.seed,
    scenario: world.config.scenario,
    config: world.config,
    status: "completed",
    startedAt: config.startAt,
    completedAt: "2026-07-13T02:00:00.000Z",
    tasks: [],
    assignments: [],
    submissions: [],
    reviews: [],
    fulfillments: [],
    events: [event],
    badCases: [badCase],
    metrics: metrics(simulationRunId, policyVersion),
  }
}

function makeEngine(): SimulationEngineAdapter {
  return {
    validateSimulationConfig: () => ({ valid: true, errors: [] }),
    generateSimulationWorld: (input) => makeWorld(input.seed),
    runSimulation: (world, policyVersion, options) =>
      makeRun(world, policyVersion, options.simulationRunId),
    compareSimulationRuns: (v0, v1): SimulationComparison => {
      if (v0.worldHash !== v1.worldHash)
        throw new Error("Runs must use the same worldHash")
      return {
        id: "comparison-1",
        dataOrigin: "simulation",
        policyVersions: ["V0", "V1"],
        v0RunId: v0.simulationRunId,
        v1RunId: v1.simulationRunId,
        v0PolicyRevision: v0.policyRevision,
        v1PolicyRevision: v1.policyRevision,
        worldHash: v0.worldHash,
        seed: v0.seed,
        scenario: v0.scenario,
        metrics: Object.fromEntries(
          metricKeys.map((key) => [
            key,
            {
              key,
              v0: 1,
              v1: 1,
              absoluteDifference: 0,
              percentagePointDifference: 0,
              safeRelativeChange: 0,
            },
          ]),
        ) as SimulationComparison["metrics"],
        recommendation: "模拟结果暂不支持升级",
        reasons: ["test"],
      }
    },
    exportSimulationArtifacts: (): SimulationExportArtifacts => ({
      "simulation_config.json": "{}",
      "simulation_runs.csv": "",
      "simulation_events.csv": "",
      "simulation_tasks.csv": "",
      "simulation_assignments.csv": "",
      "simulation_submissions.csv": "",
      "simulation_reviews.csv": "",
      "simulation_bad_cases.csv": "",
      "simulation_metrics.json": "{}",
      "simulation_comparison.json": "{}",
      "simulation_report.md": "# Demo\n模拟运营数据，不代表真实业务结果",
    }),
  }
}

function sequentialIds() {
  let value = 0
  return (prefix: string) => `${prefix}-${++value}`
}

test("paired execution persists one shared world and complete traceable runs", async () => {
  const repository = createMemorySimulationRepository()
  const service = createSimulationService({
    repository,
    engine: makeEngine(),
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })

  const result = await service.createRuns({
    config,
    policyVersions: ["V0", "V1"],
  })

  assert.equal(result.runs.length, 2)
  assert.equal(result.runs[0]?.world.id, result.runs[1]?.world.id)
  assert.equal(result.comparison?.worldHash, "world-20260713")
  assert.equal((await repository.listRuns()).length, 2)
  assert.equal(result.runs[0]?.events[0]?.scenarioId, "NORMAL")
  assert.equal(result.runs[0]?.events[0]?.entityType, "task")
  assert.equal(result.runs[0]?.run.decision, "模拟结果暂不支持升级")
})

test("comparison converts an engine world mismatch into a 422 input error", async () => {
  const repository = createMemorySimulationRepository()
  const service = createSimulationService({
    repository,
    engine: makeEngine(),
    now: () => config.startAt,
    id: sequentialIds(),
  })
  const first = await service.createRuns({ config, policyVersions: ["V0"] })
  const second = await service.createRuns({
    config: { ...config, seed: 20260714 },
    policyVersions: ["V1"],
  })

  await assert.rejects(
    service.compareRuns(first.runs[0]!.run.id, second.runs[0]!.run.id),
    (error) => error instanceof SimulationInputError && error.status === 422,
  )
})

test("an out-of-Int32 seed becomes a 400 input error before persistence", async () => {
  const repository = createMemorySimulationRepository()
  const engine = makeEngine()
  engine.validateSimulationConfig = validateActualConfig
  const service = createSimulationService({
    repository,
    engine,
    now: () => config.startAt,
    id: sequentialIds(),
  })

  await assert.rejects(
    service.createRuns({
      config: { ...config, seed: 2_147_483_648 },
      policyVersions: ["V0"],
    }),
    (error) => error instanceof SimulationInputError && error.status === 400,
  )
  assert.deepEqual(await repository.listRuns(), [])
})

test("a V1 engine failure completes the successful V0 run and marks only V1 failed", async () => {
  const repository = createMemorySimulationRepository()
  const engine = makeEngine()
  const successfulRun = engine.runSimulation
  engine.runSimulation = (world, policyVersion, options) => {
    if (policyVersion === "V1") throw new Error("V1 simulation failed")
    return successfulRun(world, policyVersion, options)
  }
  const service = createSimulationService({
    repository,
    engine,
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })

  await assert.rejects(
    service.createRuns({ config, policyVersions: ["V0", "V1"] }),
    /V1 simulation failed/,
  )

  const runs = await repository.listRuns()
  const v0 = runs.find((run) => run.policyVersion === "V0")
  const v1 = runs.find((run) => run.policyVersion === "V1")
  assert.equal(v0?.status, "completed")
  assert.ok(v0?.result)
  assert.equal((await repository.listEvents({ runId: v0?.id })).length, 1)
  assert.equal(v1?.status, "failed")
})

test("a second createRun failure never leaves the first paired run running", async () => {
  const repository = createMemorySimulationRepository()
  const createRun = repository.createRun
  let calls = 0
  repository.createRun = async (record) => {
    calls += 1
    if (calls === 2) throw new Error("second create failed")
    return createRun(record)
  }
  const service = createSimulationService({
    repository,
    engine: makeEngine(),
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })

  await assert.rejects(
    service.createRuns({ config, policyVersions: ["V0", "V1"] }),
    /second create failed/,
  )

  const persisted = await repository.listRuns()
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0]?.status, "failed")
})

test("a paired comparison failure marks every unfinished run failed", async () => {
  const repository = createMemorySimulationRepository()
  const engine = makeEngine()
  engine.compareSimulationRuns = () => {
    throw new Error("comparison failed")
  }
  const service = createSimulationService({
    repository,
    engine,
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })

  await assert.rejects(
    service.createRuns({ config, policyVersions: ["V0", "V1"] }),
    /comparison failed/,
  )

  assert.deepEqual(
    (await repository.listRuns()).map((item) => item.status),
    ["failed", "failed"],
  )
})

test("a finalize failure marks every still-unfinished run failed without partial evidence", async () => {
  const repository = createMemorySimulationRepository()
  const finalizeRun = repository.finalizeRun
  let calls = 0
  repository.finalizeRun = async (...args) => {
    calls += 1
    if (calls === 1) throw new Error("finalize failed")
    return finalizeRun(...args)
  }
  const service = createSimulationService({
    repository,
    engine: makeEngine(),
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })

  await assert.rejects(
    service.createRuns({ config, policyVersions: ["V0", "V1"] }),
    /finalize failed/,
  )

  assert.deepEqual(
    (await repository.listRuns()).map((item) => item.status),
    ["failed", "failed"],
  )
  assert.deepEqual(await repository.listEvents(), [])
})

test("clone reuses the immutable configuration but creates a new world and run", async () => {
  const repository = createMemorySimulationRepository()
  const service = createSimulationService({
    repository,
    engine: makeEngine(),
    now: () => config.startAt,
    id: sequentialIds(),
  })
  const original = await service.createRuns({ config, policyVersions: ["V0"] })

  const cloned = await service.cloneRun(original.runs[0]!.run.id)

  assert.notEqual(cloned.run.id, original.runs[0]!.run.id)
  assert.notEqual(cloned.world.id, original.runs[0]!.world.id)
  assert.deepEqual(cloned.world.config, original.runs[0]!.world.config)
})

test("actual engine persists a paired run and exports the required demo disclaimer", async () => {
  const repository = createMemorySimulationRepository()
  const service = createSimulationService({
    repository,
    engine: {
      validateSimulationConfig: validateActualConfig,
      generateSimulationWorld: generateActualWorld,
      runSimulation: runActualSimulation,
      compareSimulationRuns: compareActualRuns,
      exportSimulationArtifacts: exportActualArtifacts,
    },
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })
  const created = await service.createRuns({
    config: { ...config, adoptionCount: 2, treeCount: 2, villagerCount: 2 },
    policyVersions: ["V0", "V1"],
  })

  assert.equal(created.runs.length, 2)
  assert.equal(
    created.runs[0]?.world.worldHash,
    created.runs[1]?.world.worldHash,
  )
  const report = await service.exportArtifact(
    created.runs[0]!.run.id,
    created.runs[1]!.run.id,
    "simulation_report.md",
  )
  assert.match(report, /模拟运营数据，不代表真实业务结果/)
})

test("export overlays V0 and V1 bad-case reviews without changing immutable evidence", async () => {
  const repository = createMemorySimulationRepository()
  const engine = makeEngine()
  let exportedPair: SimulationRunPair | undefined
  engine.exportSimulationArtifacts = (pair, comparison) => {
    exportedPair = structuredClone(pair)
    return exportActualArtifacts(pair, comparison)
  }
  const service = createSimulationService({
    repository,
    engine,
    now: () => "2026-07-14T00:00:00.000Z",
    id: sequentialIds(),
  })
  const created = await service.createRuns({
    config,
    policyVersions: ["V0", "V1"],
  })
  const originalRuns = created.runs.map(
    (detail) => detail.run.result as unknown as SimulationRun,
  )

  for (const [index, detail] of created.runs.entries()) {
    await repository.updateBadCase(detail.badCases[0]!.id, {
      rootCause: `edited-root-${detail.run.policyVersion}`,
      improvementAction: `edited-action-${detail.run.policyVersion}`,
    })
    assert.deepEqual(
      detail.run.result,
      (await repository.getRun(detail.run.id))?.result,
      `PATCH must not rewrite the ${detail.run.policyVersion} run result`,
    )
    assert.equal(originalRuns[index]!.badCases[0]!.rootCause, undefined)
  }

  const badCasesCsv = await service.exportArtifact(
    created.runs[0]!.run.id,
    created.runs[1]!.run.id,
    "simulation_bad_cases.csv",
  )

  assert.match(badCasesCsv, /edited-root-V0/)
  assert.match(badCasesCsv, /edited-action-V0/)
  assert.match(badCasesCsv, /edited-root-V1/)
  assert.match(badCasesCsv, /edited-action-V1/)
  const pair = exportedPair
  assert.ok(pair)
  for (const original of originalRuns) {
    const exported: SimulationBadCase =
      original.policyVersion === "V0"
        ? pair.v0.badCases[0]!
        : pair.v1.badCases[0]!
    const {
      rootCause: _originalRootCause,
      improvementAction: _originalImprovementAction,
      ...originalEvidence
    } = original.badCases[0]!
    const { rootCause, improvementAction, ...exportedEvidence } = exported
    assert.deepEqual(exportedEvidence, originalEvidence)
    assert.equal(rootCause, `edited-root-${original.policyVersion}`)
    assert.equal(improvementAction, `edited-action-${original.policyVersion}`)
  }
})
