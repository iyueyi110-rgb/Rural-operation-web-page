import assert from "node:assert/strict"
import test from "node:test"

import { addHours, keyedRandom } from "./deterministic.ts"

import {
  ADOPTION_TRANSITIONS,
  DEFAULT_SIMULATION_CONFIG,
  REGRESSION_SEEDS,
  SCENARIOS,
  SIMULATION_LIMITS,
  TASK_TRANSITIONS,
  calculateMetrics,
  compareSimulationRuns,
  exportSimulationArtifacts,
  generateSimulationWorld,
  isValidTransition,
  runSimulation,
  runSimulationPair,
  validateSimulationConfig,
  type SimulationProvenance,
  type SimulationTaskResult,
} from "./index.ts"

test("default configuration and regression seeds are fixed", () => {
  assert.deepEqual(
    REGRESSION_SEEDS,
    [20260713, 20260714, 20260715, 20260716, 20260717],
  )
  assert.equal(DEFAULT_SIMULATION_CONFIG.seed, 20260713)
  assert.equal(DEFAULT_SIMULATION_CONFIG.durationDays, 30)
  assert.equal(DEFAULT_SIMULATION_CONFIG.adoptionCount, 100)
  assert.equal(DEFAULT_SIMULATION_CONFIG.treeCount, 100)
  assert.equal(DEFAULT_SIMULATION_CONFIG.villagerCount, 20)
  assert.equal(DEFAULT_SIMULATION_CONFIG.reviewerCount, 3)
  assert.deepEqual(DEFAULT_SIMULATION_CONFIG.tasksPerAdoption, {
    min: 3,
    max: 5,
  })
})

test("configuration validation rejects invalid ranges", () => {
  assert.equal(validateSimulationConfig(DEFAULT_SIMULATION_CONFIG).valid, true)
  const result = validateSimulationConfig({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 0,
  })
  assert.equal(result.valid, false)
  assert.match(result.errors.join(" "), /adoptionCount/)
})

test("configuration validation rejects unsafe scale and estimated workload", () => {
  const fieldCases = [
    ["durationDays", SIMULATION_LIMITS.durationDays + 1],
    ["adoptionCount", SIMULATION_LIMITS.adoptionCount + 1],
    ["treeCount", SIMULATION_LIMITS.treeCount + 1],
    ["villagerCount", SIMULATION_LIMITS.villagerCount + 1],
    ["reviewerCount", SIMULATION_LIMITS.reviewerCount + 1],
  ] as const
  for (const [key, value] of fieldCases) {
    const result = validateSimulationConfig({
      ...DEFAULT_SIMULATION_CONFIG,
      [key]: value,
    })
    assert.equal(result.valid, false)
    assert.match(result.errors.join(" "), new RegExp(key))
  }
  const tasks = validateSimulationConfig({
    ...DEFAULT_SIMULATION_CONFIG,
    tasksPerAdoption: { min: 3, max: SIMULATION_LIMITS.tasksPerAdoption + 1 },
  })
  assert.match(tasks.errors.join(" "), /tasksPerAdoption\.max/)

  const peak = validateSimulationConfig({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "ADOPTION_PEAK",
    adoptionCount: 900,
    treeCount: 1800,
  })
  assert.match(peak.errors.join(" "), /peak orders/)

  const workload = validateSimulationConfig({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 850,
    treeCount: 850,
    tasksPerAdoption: { min: 10, max: 10 },
  })
  assert.match(workload.errors.join(" "), /estimated events/)
})

test("same seed produces byte-for-byte stable worlds and different seeds differ", () => {
  const first = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  const second = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  const different = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    seed: 20260714,
  })
  assert.deepEqual(first, second)
  assert.equal(first.worldHash, second.worldHash)
  assert.notEqual(first.worldHash, different.worldHash)
})

test("world pre-generates shared deterministic daily villager availability snapshots", () => {
  const world = generateSimulationWorld(
    DEFAULT_SIMULATION_CONFIG,
  ) as ReturnType<typeof generateSimulationWorld> & {
    villagerAvailability: Array<{
      villagerId: string
      date: string
      attendanceScore: number
      availabilityScore: number
      available: boolean
    }>
  }
  assert.equal(
    world.villagerAvailability.length,
    world.villagers.length * world.config.durationDays,
  )
  assert.equal(
    new Set(
      world.villagerAvailability.map(
        (snapshot) => `${snapshot.villagerId}:${snapshot.date}`,
      ),
    ).size,
    world.villagerAvailability.length,
  )
  const byVillager = new Map<string, Set<number>>()
  for (const snapshot of world.villagerAvailability) {
    const scores = byVillager.get(snapshot.villagerId) ?? new Set<number>()
    scores.add(snapshot.availabilityScore)
    byVillager.set(snapshot.villagerId, scores)
  }
  assert.ok([...byVillager.values()].some((scores) => scores.size > 1))

  const pair = runSimulationPair(DEFAULT_SIMULATION_CONFIG, {
    pairId: "daily-availability-shared-world-test",
  })
  for (const run of [pair.v0, pair.v1])
    for (const assignment of run.assignments) {
      const snapshot = world.villagerAvailability.find(
        (item) =>
          item.villagerId === assignment.villagerId &&
          item.date === assignment.assignedAt.slice(0, 10),
      )
      assert.equal(
        snapshot?.available,
        true,
        `${assignment.id} used unavailable villager-day`,
      )
    }
  assert.equal(pair.v0.worldHash, pair.v1.worldHash)
  assert.equal(pair.world.worldHash, world.worldHash)
})

test("default world has complete linked entities and 300-500 tasks", () => {
  const world = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  assert.equal(world.adoptions.length, 100)
  assert.equal(world.trees.length, 100)
  assert.equal(world.villagers.length, 20)
  assert.equal(world.reviewers.length, 3)
  assert.ok(world.tasks.length >= 300 && world.tasks.length <= 500)
  const adoptionIds = new Set(world.adoptions.map((item) => item.id))
  const treeIds = new Set(world.trees.map((item) => item.id))
  for (const task of world.tasks) {
    assert.ok(adoptionIds.has(task.adoptionId))
    assert.ok(treeIds.has(task.treeId))
  }
  assert.deepEqual(
    new Set(world.tasks.map((task) => task.taskType)),
    new Set([
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
    ]),
  )
})

test("all eight scenario transformations are represented", () => {
  const scenarios = [
    "NORMAL",
    "ADOPTION_PEAK",
    "STAFF_SHORTAGE",
    "CONTINUOUS_RAIN",
    "LOW_SUBMISSION_QUALITY",
    "REMOTE_ZONE_LOAD",
    "REVIEW_BACKLOG",
    "HARVEST_PEAK",
  ] as const
  for (const scenario of scenarios) {
    const world = generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario,
    })
    assert.equal(world.scenarioSnapshot.id, scenario)
  }
  assert.equal(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "ADOPTION_PEAK",
    }).adoptions.length,
    180,
  )
  assert.equal(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "STAFF_SHORTAGE",
    }).villagers.filter((v) => !v.available).length,
    6,
  )
  assert.equal(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "STAFF_SHORTAGE",
    }).reviewers.filter((v) => !v.available).length,
    1,
  )
  assert.equal(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "CONTINUOUS_RAIN",
    }).weather.filter((d) => d.condition === "heavy_rain").length,
    5,
  )
  const peak = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "ADOPTION_PEAK",
  })
  const active = peak.adoptions.filter(
    (adoption) => adoption.status === "active",
  )
  assert.equal(
    new Set(active.map((adoption) => adoption.treeId)).size,
    active.length,
  )
  assert.equal(
    peak.tasks.every((task) =>
      active.some((adoption) => adoption.id === task.adoptionId),
    ),
    true,
  )
})

test("adoption and task state machines reject illegal transitions", () => {
  assert.equal(
    isValidTransition(ADOPTION_TRANSITIONS, "created", "pending_payment"),
    true,
  )
  assert.equal(
    isValidTransition(ADOPTION_TRANSITIONS, "created", "completed"),
    false,
  )
  assert.equal(isValidTransition(TASK_TRANSITIONS, "created", "assigned"), true)
  assert.equal(
    isValidTransition(TASK_TRANSITIONS, "created", "approved"),
    false,
  )
})

test("pair runs share the exact world and include provenance everywhere", () => {
  const pair = runSimulationPair(DEFAULT_SIMULATION_CONFIG, {
    pairId: "pair-test",
  })
  assert.equal(pair.v0.worldHash, pair.v1.worldHash)
  assert.equal(pair.v0.dataOrigin, "simulation")
  assert.equal(pair.v1.policyVersion, "V1")
  for (const run of [pair.v0, pair.v1]) {
    assert.ok(run.simulationRunId)
    assert.ok(run.policyRevision)
    assert.ok(run.assignments.length > 0)
    assert.ok(run.submissions.length > 0)
    assert.ok(run.reviews.length > 0)
    assert.ok(run.fulfillments.length > 0)
    for (const event of run.events) {
      assert.equal(event.dataOrigin, "simulation")
      assert.equal(event.simulationRunId, run.simulationRunId)
      assert.equal(event.policyVersion, run.policyVersion)
      assert.equal(event.policyRevision, run.policyRevision)
      assert.equal(event.scenarioId, run.scenario)
      assert.equal(event.randomSeed, run.seed)
      assert.ok(event.entityType)
      assert.ok(event.entityId)
    }
    assert.ok(
      run.events.some((event) => event.eventType === "ADOPTION_CREATED"),
    )
    assert.ok(run.events.some((event) => event.eventType === "TREE_ASSIGNED"))
    assert.ok(
      run.events.some((event) => event.eventType === "ADOPTION_ACTIVATED"),
    )
    assert.ok(run.events.some((event) => event.eventType === "TASK_COMPLETED"))
  }
})

test("task assignmentAttempts is the actual number of persisted assignment DTOs", () => {
  const run = runSimulation(
    generateSimulationWorld(DEFAULT_SIMULATION_CONFIG),
    "V1",
    { simulationRunId: "attempt-count-test" },
  )
  for (const task of run.tasks) {
    assert.equal(
      task.assignmentAttempts,
      run.assignments.filter((assignment) => assignment.taskId === task.id)
        .length,
    )
  }
})

test("acceptance rate counts accepted assignments over every valid issued assignment", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V0",
    { simulationRunId: "assignment-level-acceptance-test" },
  )
  const validAssignments = run.assignments.filter(
    (assignment) =>
      Boolean(assignment.villagerId) &&
      assignment.assignedAt <= run.completedAt,
  )

  assert.ok(
    Math.abs(run.metrics.acceptance_rate.numerator - 388) <= 5,
    `expected about 388 accepted assignments, got ${run.metrics.acceptance_rate.numerator}`,
  )
  assert.ok(
    Math.abs(run.metrics.acceptance_rate.denominator - 669) <= 15,
    `expected about 669 valid assignments, got ${run.metrics.acceptance_rate.denominator}`,
  )
  assert.equal(
    run.metrics.acceptance_rate.numerator,
    validAssignments.filter((assignment) => assignment.status === "accepted")
      .length,
  )
  assert.equal(run.metrics.acceptance_rate.denominator, validAssignments.length)
  assert.match(run.metrics.acceptance_rate.definition, /已接单分配.*有效分配/)
})

test("every accepted assignment satisfies the unchanged willingness threshold", () => {
  const world = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  const run = runSimulation(world, "V1", {
    simulationRunId: "acceptance-threshold-test",
  })
  const probe = run.assignments.find(
    (assignment) =>
      assignment.taskId === "task_0002_1" && assignment.attempt === 3,
  )

  assert.notEqual(
    probe?.status,
    "accepted",
    "task_0002_1 attempt 3 must not be force-accepted",
  )
  for (const assignment of run.assignments.filter(
    (item) => item.status === "accepted",
  )) {
    const villager = world.villagers.find(
      (item) => item.id === assignment.villagerId,
    )!
    const willingness = keyedRandom(
      world.seed,
      `${assignment.taskId}:${assignment.villagerId}`,
      "accept-willingness",
    )
    assert.ok(
      willingness < villager.reliability * 0.9,
      `${assignment.id} accepted with willingness ${willingness} outside its fixed rule threshold`,
    )
  }
})

test("V0 rotates the available roster without requiring a skill match", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 1,
    treeCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  const taskType = world.tasks[0]!.taskType
  for (const villager of world.villagers)
    villager.skills = villager.skills.filter((skill) =>
      skill === taskType ? false : true,
    )
  const run = runSimulation(world, "V0", { simulationRunId: "v0-roster-test" })
  assert.ok(run.assignments.length > 0)
  const rosterRun = runSimulation(
    generateSimulationWorld(DEFAULT_SIMULATION_CONFIG),
    "V0",
    { simulationRunId: "v0-roster-spread-test" },
  )
  assert.ok(
    new Set(
      rosterRun.assignments.map((item) => item.villagerId).filter(Boolean),
    ).size > 1,
  )
})

test("V0 rejection requires operator intervention before reassignment", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "STAFF_SHORTAGE",
    }),
    "V0",
    { simulationRunId: "v0-manual-reassign-test" },
  )
  const reassignedTaskIds = new Set(
    run.events
      .filter((event) => event.eventType === "TASK_REASSIGNED")
      .map((event) => event.taskId),
  )
  assert.ok(reassignedTaskIds.size > 0)
  for (const taskId of reassignedTaskIds) {
    const taskEvents = run.events.filter((event) => event.taskId === taskId)
    const reassignment = taskEvents.findIndex(
      (event) => event.eventType === "TASK_REASSIGNED",
    )
    assert.ok(
      taskEvents
        .slice(0, reassignment)
        .some(
          (event) =>
            event.eventType === "MANUAL_INTERVENTION" &&
            event.actorType === "operator",
        ),
    )
  }
})

test("active adoptions emit the complete status-change lifecycle", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      adoptionCount: 1,
      treeCount: 1,
    }),
    "V1",
    { simulationRunId: "adoption-lifecycle-test" },
  )
  const transitions = run.events
    .filter((event) => event.eventType === "ADOPTION_STATUS_CHANGED")
    .map((event) => `${event.fromStatus}->${event.toStatus}`)
  assert.deepEqual(transitions, [
    "created->pending_payment",
    "pending_payment->paid",
    "paid->active",
    "active->harvest_ready",
    "harvest_ready->fulfillment_pending",
    "fulfillment_pending->completed",
  ])
  const paid = run.events.find((event) => event.eventType === "ADOPTION_PAID")
  assert.equal(paid?.fromStatus, undefined)
  assert.equal(paid?.toStatus, undefined)
})

test("adoption lifecycle emits one canonical transition and replays normal and exceptional paths", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      adoptionCount: 100,
      treeCount: 100,
    }),
    "V1",
    { simulationRunId: "canonical-adoption-replay-test" },
  )
  const semanticTypes = new Set([
    "ADOPTION_PAID",
    "ADOPTION_ACTIVATED",
    "ADOPTION_FULFILLING",
    "ADOPTION_COMPLETED",
    "ADOPTION_CANCELLED",
    "ADOPTION_REFUNDED",
    "ADOPTION_DISPUTED",
  ])
  for (const event of run.events.filter((item) =>
    semanticTypes.has(item.eventType),
  )) {
    assert.equal(
      event.fromStatus,
      undefined,
      `${event.eventType} duplicated fromStatus`,
    )
    assert.equal(
      event.toStatus,
      undefined,
      `${event.eventType} duplicated toStatus`,
    )
  }

  const replayed = new Map<string, string>()
  for (const event of run.events.filter(
    (item) =>
      item.entityType === "adoption" &&
      (item.eventType === "ADOPTION_CREATED" ||
        item.eventType === "ADOPTION_STATUS_CHANGED"),
  )) {
    const adoptionId = event.adoptionId!
    const current = replayed.get(adoptionId)
    if (event.fromStatus)
      assert.equal(
        event.fromStatus,
        current,
        `${event.eventType} for ${adoptionId} has a ghost fromStatus`,
      )
    replayed.set(adoptionId, event.toStatus!)
  }
  assert.equal(replayed.get("adoption_0050"), "cancelled")
  assert.equal(replayed.get("adoption_0075"), "refunded")
  assert.equal(replayed.get("adoption_0100"), "disputed")
  const transitionKeys = run.events
    .filter(
      (event) =>
        event.entityType === "adoption" && event.fromStatus && event.toStatus,
    )
    .map(
      (event) =>
        `${event.adoptionId}:${event.occurredAt}:${event.fromStatus}:${event.toStatus}`,
    )
  assert.equal(new Set(transitionKeys).size, transitionKeys.length)
})

test("completed tasks emit completion, settlement, and non-rights growth updates", () => {
  const run = runSimulation(
    generateSimulationWorld(DEFAULT_SIMULATION_CONFIG),
    "V1",
    { simulationRunId: "completion-events-test" },
  )
  for (const task of run.tasks.filter((item) => item.status === "completed")) {
    const types = new Set(
      run.events
        .filter((event) => event.taskId === task.id)
        .map((event) => event.eventType),
    )
    assert.ok(types.has("TASK_COMPLETED"))
    assert.ok(types.has("TASK_SETTLED"))
    if (
      !["harvest", "packing", "shipping", "onsite_reception"].includes(
        task.taskType,
      )
    )
      assert.ok(types.has("GROWTH_UPDATE_SENT"))
  }
})

test("average review hours pairs each review completion with its own review start", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V0",
    { simulationRunId: "review-duration-test" },
  )
  const completions = run.events.filter(
    (event) =>
      event.eventType === "REVIEW_APPROVED" ||
      event.eventType === "REVIEW_RETURNED",
  )
  const expectedTotal = run.reviews.reduce((sum, review) => {
    const submission = run.submissions.find(
      (item) => item.id === review.submissionId,
    )
    assert.ok(submission)
    return (
      sum +
      (new Date(review.completedAt).getTime() -
        new Date(submission.submittedAt).getTime()) /
        3_600_000
    )
  }, 0)
  assert.equal(
    run.metrics.average_review_hours.value,
    expectedTotal / run.reviews.length,
  )
})

test("returned work uses the final valid submission for on-time and overdue metrics", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V0",
    { simulationRunId: "valid-submission-test" },
  )
  const returned = run.tasks.find(
    (task) => task.firstReviewPassed === false && task.finalReviewPassed,
  )
  assert.ok(returned)
  const lastSubmission = run.submissions
    .filter((item) => item.taskId === returned.id)
    .at(-1)
  assert.ok(lastSubmission)
  assert.equal(returned.submittedAt, lastSubmission.submittedAt)
})

test("an on-time first submission returned after due becomes one replayable overdue case", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    seed: 1,
    adoptionCount: 1,
    treeCount: 1,
    villagerCount: 1,
    reviewerCount: 1,
    durationDays: 10,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  const seed = world.tasks[0]!
  seed.taskType = "watering"
  seed.executionHours = 1
  seed.qualityRoll = 0
  seed.clarityRoll = 0
  seed.reviewHours = 20
  seed.dueAt = addHours(seed.createdAt, 18)
  world.villagers[0]!.reliability = 1

  const run = runSimulation(world, "V0", {
    simulationRunId: "returned-after-due-overdue-test",
  })
  const result = run.tasks[0]!
  const taskEvents = run.events.filter((event) => event.taskId === result.id)
  const firstSubmission = run.submissions.find(
    (submission) => submission.taskId === result.id && submission.attempt === 1,
  )!
  const returned = taskEvents.find(
    (event) => event.eventType === "REVIEW_RETURNED",
  )!
  const overdueEvents = taskEvents.filter(
    (event) => event.eventType === "TASK_OVERDUE",
  )
  const overdueCases = run.badCases.filter(
    (badCase) => badCase.category === "overdue",
  )

  assert.ok(firstSubmission.submittedAt <= result.effectiveDueAt)
  assert.ok(returned.occurredAt > result.effectiveDueAt)
  assert.ok(result.submittedAt! > result.effectiveDueAt)
  assert.equal(overdueEvents.length, 1)
  assert.equal(overdueCases.length, 1)
  const returnedIndex = taskEvents.indexOf(returned)
  assert.deepEqual(
    taskEvents
      .slice(returnedIndex, returnedIndex + 3)
      .map((event) => `${event.fromStatus}->${event.toStatus}`),
    ["submitted->returned", "returned->overdue", "overdue->submitted"],
  )
  assert.deepEqual(
    new Set(
      run.tasks
        .filter(
          (task) =>
            task.effectiveDueAt <= run.completedAt &&
            (!task.submittedAt || task.submittedAt > task.effectiveDueAt),
        )
        .map((task) => task.id),
    ),
    new Set(overdueEvents.map((event) => event.taskId)),
  )
  assert.deepEqual(
    new Set(overdueCases.map((badCase) => badCase.taskId)),
    new Set(overdueEvents.map((event) => event.taskId)),
  )
})

test("final review pass rate uses a fixed 72-hour review opportunity horizon", () => {
  const provenance: SimulationProvenance = {
    dataOrigin: "simulation",
    simulationRunId: "review-horizon-test",
    policyVersion: "V0",
    policyRevision: "V0-test",
  }
  const task = (
    id: string,
    submittedAt: string,
    finalReviewPassed?: boolean,
  ): SimulationTaskResult => ({
    ...provenance,
    id,
    adoptionId: "adoption_1",
    treeId: "tree_1",
    taskType: "watering",
    status: finalReviewPassed ? "completed" : "submitted",
    zone: "near",
    assignmentAttempts: 1,
    createdAt: "2026-07-13T00:00:00.000Z",
    assignedAt: "2026-07-13T01:00:00.000Z",
    dueAt: "2026-07-20T00:00:00.000Z",
    effectiveDueAt: "2026-07-20T00:00:00.000Z",
    acceptedAt: "2026-07-13T02:00:00.000Z",
    submittedAt,
    finalReviewPassed,
    anomalyExpected: false,
  })
  const metrics = calculateMetrics(
    [
      task("boundary-approved", "2026-07-28T00:00:00.000Z", true),
      task("old-unreviewed-backlog", "2026-07-20T00:00:00.000Z"),
      task("edge-approved", "2026-07-28T00:00:00.001Z", true),
    ],
    [],
    [],
    provenance,
    { observationEnd: "2026-07-31T00:00:00.000Z" },
  )

  assert.equal(metrics.final_review_pass_rate.numerator, 1)
  assert.equal(metrics.final_review_pass_rate.denominator, 2)
  assert.equal(metrics.final_review_pass_rate.value, 0.5)
  assert.match(metrics.final_review_pass_rate.definition, /72小时/)
})

test("rights denominator includes due but unfulfilled rights tasks", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 1,
    treeCount: 1,
    durationDays: 30,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  world.tasks[0]!.taskType = "shipping"
  for (const villager of world.villagers) villager.available = false
  const run = runSimulation(world, "V1", {
    simulationRunId: "unfulfilled-rights-test",
  })
  assert.equal(run.metrics.rights_on_time_fulfillment_rate.denominator, 1)
  assert.equal(run.metrics.rights_on_time_fulfillment_rate.numerator, 0)
})

test("adoption completes only when every required task and right completes", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 1,
    treeCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  for (const villager of world.villagers) villager.available = false
  const run = runSimulation(world, "V1", {
    simulationRunId: "incomplete-adoption-test",
  })
  assert.equal(
    run.events.some((event) => event.eventType === "ADOPTION_COMPLETED"),
    false,
  )
})

test("adoption completion is causally after its last required task completion", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      adoptionCount: 1,
      treeCount: 1,
    }),
    "V1",
    { simulationRunId: "adoption-causal-time-test" },
  )
  const completion = run.events.find(
    (event) => event.eventType === "ADOPTION_COMPLETED",
  )
  assert.ok(completion)
  const lastTask = run.tasks
    .filter(
      (task) => task.adoptionId === completion.adoptionId && task.completedAt,
    )
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))[0]
  assert.ok(lastTask?.completedAt)
  assert.ok(completion.occurredAt > lastTask.completedAt)
})

test("pending valid review job becomes backlog only at observation end", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 1,
    treeCount: 1,
    durationDays: 10,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  world.tasks[0]!.executionHours = 1
  for (const reviewer of world.reviewers) reviewer.available = false
  const run = runSimulation(world, "V1", {
    simulationRunId: "pending-review-backlog-test",
  })
  const backlog = run.badCases.find(
    (item) => item.category === "review_backlog",
  )
  assert.ok(backlog)
  assert.equal(
    run.events.some(
      (event) =>
        event.taskId === backlog.taskId && event.eventType === "REVIEW_STARTED",
    ),
    false,
  )
})

test("durationDays is a strict observation window", () => {
  const run = runSimulation(
    generateSimulationWorld({ ...DEFAULT_SIMULATION_CONFIG, durationDays: 1 }),
    "V1",
    { simulationRunId: "window-test" },
  )
  assert.ok(run.events.every((event) => event.occurredAt <= run.completedAt))
  assert.equal(run.metrics.on_time_submission_rate.denominator, 0)
  assert.equal(run.metrics.overdue_rate.denominator, 0)
  for (const task of run.tasks)
    assert.equal(
      task.assignmentAttempts,
      run.assignments.filter((assignment) => assignment.taskId === task.id)
        .length,
    )
  const eventIds = new Set(run.events.map((event) => event.id))
  assert.ok(
    run.badCases.every(
      (item) =>
        item.eventIds.length > 0 &&
        item.eventIds.every((id) => eventIds.has(id)),
    ),
  )
  assert.ok(
    run.assignments.every(
      (item) => !item.respondedAt || item.respondedAt <= run.completedAt,
    ),
  )
})

test("V1 models response timeout, expiry, and three-candidate escalation", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "STAFF_SHORTAGE",
    }),
    "V1",
    { simulationRunId: "timeout-escalation-test" },
  )
  assert.ok(run.assignments.some((item) => item.status === "expired"))
  assert.ok(run.assignments.some((item) => item.status === "escalated"))
  assert.ok(
    run.assignments
      .filter((item) => item.status === "escalated")
      .every((item) => item.attempt === 3),
  )
  for (const assignment of run.assignments.filter(
    (item) => item.status === "expired" || item.status === "escalated",
  )) {
    const expectedType =
      assignment.status === "expired"
        ? "ASSIGNMENT_EXPIRED"
        : "ASSIGNMENT_ESCALATED"
    const stateEvent = run.events.find(
      (event) =>
        event.eventType === expectedType && event.entityId === assignment.id,
    )
    assert.ok(stateEvent, `${assignment.id} must emit ${expectedType}`)
    assert.equal(stateEvent.entityType, "assignment")
    assert.equal(stateEvent.fromStatus, "assigned")
    assert.equal(stateEvent.toStatus, assignment.status)
    assert.equal(stateEvent.payload.attempt, assignment.attempt)
    assert.equal(stateEvent.payload.deadline, assignment.responseDeadlineAt)
  }
  const replayedTaskStatus = new Map<string, string>()
  for (const event of run.events.filter(
    (item) =>
      item.taskId && item.toStatus && !item.eventType.startsWith("ASSIGNMENT_"),
  )) {
    const current = replayedTaskStatus.get(event.taskId!)
    if (event.fromStatus)
      assert.equal(
        event.fromStatus,
        current,
        `${event.eventType} for ${event.taskId} has a ghost fromStatus`,
      )
    replayedTaskStatus.set(event.taskId!, event.toStatus!)
  }
  assert.ok(
    run.events.some(
      (event) =>
        event.eventType === "TASK_REJECTED" && event.toStatus === "rejected",
    ),
    "villager rejection must remain an explicit task event",
  )
})

test("review starts only after its submission is ready", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "REVIEW_BACKLOG",
    }),
    "V1",
    { simulationRunId: "review-ready-order-test" },
  )
  for (const review of run.reviews) {
    const submission = run.submissions.find(
      (item) => item.id === review.submissionId,
    )!
    assert.ok(review.startedAt >= submission.submittedAt)
  }
})

test("reminders expose deterministic risk components", () => {
  const run = runSimulation(
    generateSimulationWorld(DEFAULT_SIMULATION_CONFIG),
    "V1",
    { simulationRunId: "risk-reminder-test" },
  )
  const reminder = run.events.find(
    (event) => event.eventType === "REMINDER_SENT",
  )
  assert.ok(reminder)
  for (const key of [
    "difficultyRisk",
    "distanceRisk",
    "loadRisk",
    "reliabilityRisk",
    "isAtRisk",
  ])
    assert.ok(key in reminder.payload)
})

test("precheck records all seven deterministic credential checks", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V1",
    { simulationRunId: "complete-precheck-test" },
  )
  const event = run.events.find(
    (item) => item.eventType === "SUBMISSION_PRECHECK_FAILED",
  )
  assert.ok(event)
  const checks = event.payload.checks as Record<string, boolean>
  assert.deepEqual(
    Object.keys(checks).sort(),
    [
      "clarity",
      "descriptionLength",
      "duplicate",
      "executionTime",
      "fieldCompleteness",
      "photoCount",
      "treeCode",
    ].sort(),
  )
})

test("villager reliability is composed from historical behavior", () => {
  const world = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  for (const villager of world.villagers) {
    const parts = villager as typeof villager & {
      historicalAcceptanceRate: number
      historicalOnTimeRate: number
      historicalFirstPassRate: number
    }
    assert.equal(
      villager.reliability,
      Number(
        (
          (parts.historicalAcceptanceRate +
            parts.historicalOnTimeRate +
            parts.historicalFirstPassRate) /
          3
        ).toFixed(4),
      ),
    )
  }
})

test("late rights prevent adoption completion and are reported only after promise time", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "HARVEST_PEAK",
    }),
    "V1",
    { simulationRunId: "late-rights-adoption-test" },
  )
  const late = run.tasks.filter(
    (task) => task.rightsFulfilledOnTime === false && task.completedAt,
  )
  assert.ok(late.length > 0)
  const completedAdoptions = new Set(
    run.events
      .filter((event) => event.eventType === "ADOPTION_COMPLETED")
      .map((event) => event.adoptionId),
  )
  assert.ok(late.every((task) => !completedAdoptions.has(task.adoptionId)))
  const end = new Date(run.completedAt).getTime()
  for (const item of run.badCases.filter(
    (badCase) => badCase.category === "rights_delay",
  )) {
    const task = run.tasks.find((candidate) => candidate.id === item.taskId)!
    assert.ok(new Date(task.effectiveDueAt).getTime() + 72 * 3_600_000 <= end)
  }
})

test("review capacity creates a deterministic queue and reviewer actors are typed", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "REVIEW_BACKLOG",
    reviewerCount: 1,
  })
  world.reviewers[0]!.dailyCapacity = 1
  const run = runSimulation(world, "V1", {
    simulationRunId: "review-queue-test",
  })
  assert.ok(
    run.events
      .filter((event) => event.eventType.startsWith("REVIEW_"))
      .every((event) => event.actorType === "reviewer"),
  )
  const reviewer = run.reviews[0]?.reviewerId
  assert.ok(reviewer)
  const ordered = run.reviews
    .filter((review) => review.reviewerId === reviewer)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (let index = 1; index < ordered.length; index += 1)
    assert.ok(ordered[index]!.startedAt >= ordered[index - 1]!.completedAt)
  const startsPerDay = new Map<string, number>()
  for (const review of ordered)
    startsPerDay.set(
      review.startedAt.slice(0, 10),
      (startsPerDay.get(review.startedAt.slice(0, 10)) ?? 0) + 1,
    )
  assert.ok([...startsPerDay.values()].every((count) => count <= 1))
  assert.ok(ordered.length > 1)
})

test("rain extension requires enabled weather and an intersecting heavy-rain window", () => {
  const disabledWorld = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "CONTINUOUS_RAIN",
    weatherEnabled: false,
  })
  const disabled = runSimulation(disabledWorld, "V1", {
    simulationRunId: "rain-disabled-test",
  })
  assert.ok(
    disabled.tasks
      .filter((task) => task.taskType === "watering")
      .every((task) => task.effectiveDueAt === task.dueAt),
  )
  assert.equal(
    disabled.tasks.some((task) => task.taskType === "drainage"),
    false,
  )
  const enabled = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "CONTINUOUS_RAIN",
    }),
    "V1",
    { simulationRunId: "rain-intersection-test" },
  )
  assert.ok(
    enabled.tasks
      .filter(
        (task) =>
          task.taskType === "watering" &&
          task.createdAt > "2026-07-26T00:00:00.000Z",
      )
      .every((task) => task.effectiveDueAt === task.dueAt),
  )
})

test("continuous-rain pause and extension are V1-only and task events replay without ghost states", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "CONTINUOUS_RAIN",
  })
  const v0 = runSimulation(world, "V0", {
    simulationRunId: "rain-policy-v0-test",
  })
  assert.equal(
    v0.events.some((event) => event.eventType === "WEATHER_DELAY_APPROVED"),
    false,
  )
  assert.ok(
    v0.tasks
      .filter((task) => task.taskType === "watering")
      .every((task) => task.effectiveDueAt === task.dueAt),
  )
  for (const started of v0.events.filter(
    (event) => event.eventType === "TASK_STARTED",
  )) {
    const accepted = v0.events.find(
      (event) =>
        event.taskId === started.taskId && event.eventType === "TASK_ACCEPTED",
    )!
    assert.equal(
      new Date(started.occurredAt).getTime() -
        new Date(accepted.occurredAt).getTime(),
      30 * 60_000,
      `${started.taskId} must not use the V1 rain pause in V0`,
    )
  }

  const v1 = runSimulation(world, "V1", {
    simulationRunId: "rain-policy-v1-test",
  })
  const heavyRain = world.weather.filter(
    (day) => day.condition === "heavy_rain",
  )
  const delayedTaskIds = new Set(
    v1.events
      .filter((event) => event.eventType === "WEATHER_DELAY_APPROVED")
      .map((event) => event.taskId!),
  )
  assert.ok(delayedTaskIds.size > 0)
  for (const taskId of delayedTaskIds) {
    const task = v1.tasks.find((item) => item.id === taskId)!
    const started = v1.events.find(
      (event) => event.taskId === taskId && event.eventType === "TASK_STARTED",
    )!
    assert.ok(task.effectiveDueAt > task.dueAt)
    assert.ok(task.effectiveDueAt >= started.occurredAt)
    assert.equal(
      v1.events.some(
        (event) =>
          event.taskId === taskId && event.eventType === "TASK_OVERDUE",
      ),
      false,
      `${taskId} must not count an approved weather delay as overdue`,
    )
    assert.equal(
      heavyRain.some(
        (day) =>
          day.date <= started.occurredAt &&
          started.occurredAt <
            new Date(new Date(day.date).getTime() + 86_400_000).toISOString(),
      ),
      false,
    )
  }

  const replayed = new Map<string, string>()
  for (const event of v1.events.filter(
    (item) =>
      item.taskId && item.toStatus && !item.eventType.startsWith("ASSIGNMENT_"),
  )) {
    const current = replayed.get(event.taskId!)
    if (event.fromStatus)
      assert.equal(
        event.fromStatus,
        current,
        `${event.eventType} for ${event.taskId} has a ghost fromStatus`,
      )
    replayed.set(event.taskId!, event.toStatus!)
  }
})

test("V1 precheck preserves failed evidence and creates a corrected submission attempt", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V1",
    { simulationRunId: "precheck-attempt-test" },
  )
  const failure = run.events.find(
    (event) => event.eventType === "SUBMISSION_PRECHECK_FAILED",
  )
  assert.ok(failure?.taskId)
  const attempts = run.submissions.filter(
    (submission) => submission.taskId === failure.taskId,
  )
  assert.deepEqual(
    attempts.map((item) => item.attempt),
    [1, 2],
  )
  assert.equal(new Set(attempts.map((item) => item.id)).size, attempts.length)
  assert.equal(attempts[0]!.precheckPassed, false)
  assert.equal(attempts[1]!.precheckPassed, true)
})

test("V1 assignments respect each villager daily capacity", () => {
  const world = generateSimulationWorld(DEFAULT_SIMULATION_CONFIG)
  const run = runSimulation(world, "V1", {
    simulationRunId: "daily-capacity-test",
  })
  for (const villager of world.villagers) {
    const byDay = new Map<string, number>()
    for (const assignment of run.assignments.filter(
      (item) => item.villagerId === villager.id && item.status === "accepted",
    )) {
      const day = assignment.assignedAt.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    assert.ok(
      [...byDay.values()].every((count) => count <= villager.dailyCapacity),
    )
  }
})

test("V1 assignment score uses the real daily availability score for its ten-percent component", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    seed: 1,
    adoptionCount: 1,
    treeCount: 1,
    villagerCount: 1,
    reviewerCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  const task = world.tasks[0]!
  const villager = world.villagers[0]!
  task.taskType = "watering"
  task.zone = "near"
  villager.skills = ["watering"]
  villager.zone = "near"
  villager.reliability = 0.5
  const snapshot = world.villagerAvailability.find(
    (item) =>
      item.villagerId === villager.id &&
      item.date === task.createdAt.slice(0, 10),
  )!
  snapshot.attendanceScore = 1
  snapshot.availabilityScore = 0.37
  snapshot.available = true

  const run = runSimulation(world, "V1", {
    simulationRunId: "daily-availability-score-test",
  })

  assert.equal(run.assignments[0]?.score, 0.837)
})

test("accepted execution capacity is evaluated on actual assignedAt across midnight", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 3,
    treeCount: 3,
    villagerCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  world.villagers[0]!.dailyCapacity = 1
  for (const task of world.tasks) task.createdAt = "2026-07-13T23:30:00.000Z"
  const run = runSimulation(world, "V1", {
    simulationRunId: "midnight-capacity-test",
  })
  const acceptedByDay = new Map<string, number>()
  for (const assignment of run.assignments.filter(
    (item) => item.status === "accepted",
  )) {
    const day = assignment.assignedAt.slice(0, 10)
    acceptedByDay.set(day, (acceptedByDay.get(day) ?? 0) + 1)
  }
  assert.ok([...acceptedByDay.values()].every((count) => count <= 1))
})

test("V1 review dispatch respects readyAt and uses priority only among ready jobs", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 2,
    treeCount: 2,
    reviewerCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  const [ordinary, rights] = world.tasks
  ordinary!.taskType = "watering"
  ordinary!.priority = 1
  rights!.taskType = "shipping"
  rights!.priority = 3
  rights!.createdAt = ordinary!.createdAt
  rights!.executionHours = ordinary!.executionHours
  const run = runSimulation(world, "V1", {
    simulationRunId: "review-priority-test",
  })
  const rightsReview = run.reviews.find((item) => item.taskId === rights!.id)
  const ordinaryReview = run.reviews.find(
    (item) => item.taskId === ordinary!.id,
  )
  assert.ok(rightsReview && ordinaryReview)
  const rightsSubmission = run.submissions.find(
    (item) => item.id === rightsReview.submissionId,
  )!
  const ordinarySubmission = run.submissions.find(
    (item) => item.id === ordinaryReview.submissionId,
  )!
  if (rightsSubmission.submittedAt === ordinarySubmission.submittedAt)
    assert.ok(rightsReview.startedAt <= ordinaryReview.startedAt)
  else if (rightsSubmission.submittedAt < ordinarySubmission.submittedAt)
    assert.ok(rightsReview.startedAt <= ordinaryReview.startedAt)
  else assert.ok(ordinaryReview.startedAt <= rightsReview.startedAt)
})

test("V0 reviews an earlier ready submission before a later one", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 2,
    treeCount: 2,
    reviewerCount: 1,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  const run = runSimulation(world, "V0", {
    simulationRunId: "v0-ready-fifo-test",
  })
  const firstReviews = run.reviews.filter(
    (review) =>
      !run.reviews.some(
        (other) =>
          other.taskId === review.taskId && other.startedAt < review.startedAt,
      ),
  )
  const ordered = firstReviews
    .map((review) => ({
      review,
      submission: run.submissions.find(
        (item) => item.id === review.submissionId,
      )!,
    }))
    .sort((a, b) =>
      a.submission.submittedAt.localeCompare(b.submission.submittedAt),
    )
  for (let index = 1; index < ordered.length; index += 1)
    assert.ok(
      ordered[index - 1]!.review.startedAt <= ordered[index]!.review.startedAt,
    )
})

test("future acceptance does not leak into load at the same creation instant", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    adoptionCount: 3,
    treeCount: 3,
    tasksPerAdoption: { min: 1, max: 1 },
  })
  for (const task of world.tasks) task.createdAt = "2026-07-13T08:00:00.000Z"
  const run = runSimulation(world, "V1", {
    simulationRunId: "future-load-test",
  })
  const initialAssignments = run.events.filter(
    (event) => event.eventType === "TASK_ASSIGNED",
  )
  assert.ok(initialAssignments.length > 0)
  assert.ok(
    initialAssignments.every((event) => event.payload.loadAtAssignment === 0),
  )
})

test("adoption peak records overflow inventory cases without duplicate active trees", () => {
  const pair = runSimulationPair(
    { ...DEFAULT_SIMULATION_CONFIG, scenario: "ADOPTION_PEAK" },
    { pairId: "inventory-test" },
  )
  assert.ok(
    pair.v0.events.some((event) => event.eventType === "INVENTORY_SHORTAGE"),
  )
  assert.ok(
    pair.v0.badCases.some(
      (item) =>
        item.category === "inventory_shortage" &&
        item.adoptionId &&
        item.title &&
        item.description,
    ),
  )
})

test("V1 automatic reassignment never exceeds three candidates", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "STAFF_SHORTAGE",
    }),
    "V1",
    {
      simulationRunId: "reassignment-test",
    },
  )
  const attempts = new Map<string, number>()
  for (const event of run.events.filter(
    (event) =>
      event.eventType === "TASK_ASSIGNED" ||
      event.eventType === "TASK_REASSIGNED",
  )) {
    if (!event.taskId) continue
    attempts.set(event.taskId, (attempts.get(event.taskId) ?? 0) + 1)
  }
  assert.ok([...attempts.values()].every((count) => count <= 3))
})

test("V1 continuous-rain policy extends effective due dates and creates drainage work", () => {
  const world = generateSimulationWorld({
    ...DEFAULT_SIMULATION_CONFIG,
    scenario: "CONTINUOUS_RAIN",
  })
  const run = runSimulation(world, "V1", { simulationRunId: "rain-test" })
  const watering = run.tasks.filter((task) => task.taskType === "watering")
  assert.ok(watering.some((task) => task.effectiveDueAt > task.dueAt))
  assert.ok(run.tasks.some((task) => task.taskType === "drainage"))
  assert.ok(
    run.tasks.some(
      (task) =>
        task.taskType === "pest_inspection" && task.id.endsWith("_pest"),
    ),
  )
  const rainWindows = world.weather
    .filter((day) => day.condition === "heavy_rain")
    .map(
      (day) =>
        [
          day.date,
          new Date(new Date(day.date).getTime() + 86_400_000).toISOString(),
        ] as const,
    )
  for (const event of run.events.filter(
    (item) =>
      item.eventType === "TASK_STARTED" &&
      run.tasks.find((task) => task.id === item.taskId)?.taskType ===
        "watering",
  )) {
    assert.ok(
      rainWindows.every(
        ([start, end]) => event.occurredAt < start || event.occurredAt >= end,
      ),
    )
  }
})

test("metrics expose numerator, denominator, null zero-denominator values and all required keys", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      adoptionCount: 1,
      treeCount: 1,
      villagerCount: 1,
      reviewerCount: 1,
      tasksPerAdoption: { min: 0, max: 0 },
    }),
    "V0",
    { simulationRunId: "empty-test" },
  )
  const expected = [
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
  assert.deepEqual(Object.keys(run.metrics).sort(), [...expected].sort())
  assert.equal(run.metrics.acceptance_rate.denominator, 0)
  assert.equal(run.metrics.acceptance_rate.value, null)
})

test("comparison rejects mismatched worlds", () => {
  const v0 = runSimulation(
    generateSimulationWorld(DEFAULT_SIMULATION_CONFIG),
    "V0",
    { simulationRunId: "mismatch-v0" },
  )
  const v1 = runSimulation(
    generateSimulationWorld({ ...DEFAULT_SIMULATION_CONFIG, seed: 20260714 }),
    "V1",
    { simulationRunId: "mismatch-v1" },
  )
  assert.throws(() => compareSimulationRuns(v0, v1), /worldHash|same world/i)
})

test("both peak scenarios reject on-time submission drops beyond two percentage points", () => {
  for (const scenario of ["ADOPTION_PEAK", "HARVEST_PEAK"] as const) {
    const pair = runSimulationPair(
      { ...DEFAULT_SIMULATION_CONFIG, scenario },
      { pairId: `peak-on-time-gate-${scenario}` },
    )
    const compareAt = (v1OnTime: number) => {
      const v0 = structuredClone(pair.v0)
      const v1 = structuredClone(pair.v1)
      for (const run of [v0, v1])
        for (const key of [
          "acceptance_rate",
          "on_time_submission_rate",
          "first_review_pass_rate",
          "final_review_pass_rate",
        ] as const) {
          run.metrics[key].numerator = 80
          run.metrics[key].denominator = 100
          run.metrics[key].value = 0.8
        }
      v0.metrics.overdue_rate.value = 0.1
      v1.metrics.overdue_rate.value = 0.1
      v1.metrics.on_time_submission_rate.numerator = v1OnTime * 1000
      v1.metrics.on_time_submission_rate.denominator = 1000
      v1.metrics.on_time_submission_rate.value = v1OnTime
      return compareSimulationRuns(v0, v1)
    }

    const withinGate = compareAt(0.781)
    assert.notEqual(withinGate.recommendation, "存在场景退化，需要继续调整")
    assert.equal(
      withinGate.reasons.some((reason) => reason.includes("高峰场景")),
      false,
    )

    const exactlyAtGate = compareAt(0.78)
    assert.notEqual(exactlyAtGate.recommendation, "存在场景退化，需要继续调整")
    assert.equal(
      exactlyAtGate.reasons.some((reason) => reason.includes("高峰场景")),
      false,
    )

    const beyondGate = compareAt(0.779)
    assert.equal(beyondGate.recommendation, "存在场景退化，需要继续调整")
    assert.ok(
      beyondGate.reasons.some(
        (reason) => reason.includes("高峰场景") && reason.includes("2个百分点"),
      ),
    )
  }
})

test("paired comparison returns only the four exact PDF upgrade recommendations", () => {
  const pair = runSimulationPair(DEFAULT_SIMULATION_CONFIG, {
    pairId: "recommendation-test",
  })
  const comparison = compareSimulationRuns(pair.v0, pair.v1)
  const allowed = new Set([
    "模拟结果建议采用V1",
    "模拟结果暂不支持升级",
    "存在场景退化，需要继续调整",
    "样本不足，暂不形成结论",
  ])
  assert.ok(allowed.has(comparison.recommendation))
  assert.deepEqual(
    (comparison as unknown as { policyVersions: string[] }).policyVersions,
    ["V0", "V1"],
  )
})

test("bad cases preserve a traceable event chain", () => {
  const run = runSimulation(
    generateSimulationWorld({
      ...DEFAULT_SIMULATION_CONFIG,
      scenario: "LOW_SUBMISSION_QUALITY",
    }),
    "V0",
    { simulationRunId: "bad-case-test" },
  )
  const eventIds = new Set(run.events.map((event) => event.id))
  assert.ok(run.badCases.length > 0)
  assert.ok(
    run.badCases.every(
      (badCase) =>
        badCase.eventIds.length > 0 &&
        badCase.eventIds.every((id) => eventIds.has(id)),
    ),
  )
  for (const badCase of run.badCases.filter((item) => item.taskId)) {
    assert.deepEqual(
      badCase.eventIds,
      run.events
        .filter((event) => event.taskId === badCase.taskId)
        .map((event) => event.id),
      `${badCase.category} must contain the task's complete final event chain`,
    )
  }
  const qualityReturn = run.badCases.find(
    (item) => item.category === "quality_return",
  )
  assert.ok(qualityReturn)
  const qualityTypes = qualityReturn.eventIds.map(
    (id) => run.events.find((event) => event.id === id)!.eventType,
  )
  assert.ok(qualityTypes.includes("REVIEW_RETURNED"))
  assert.ok(qualityTypes.includes("TASK_SETTLED"))
})

test("five-by-eight regression covers all seven fixed bad-case categories with visible evidence", () => {
  const categories = new Set<string>()
  for (const seed of REGRESSION_SEEDS)
    for (const scenario of SCENARIOS) {
      const pair = runSimulationPair(
        { ...DEFAULT_SIMULATION_CONFIG, seed, scenario },
        { pairId: `badcase-matrix-${seed}-${scenario}` },
      )
      assert.equal(pair.v0.worldHash, pair.world.worldHash)
      assert.equal(pair.v1.worldHash, pair.world.worldHash)
      for (const run of [pair.v0, pair.v1]) {
        const eventIds = new Set(run.events.map((event) => event.id))
        const badCaseKeys = new Set<string>()
        for (const item of run.badCases) {
          const key = `${item.taskId ?? item.adoptionId}:${item.category}`
          assert.equal(badCaseKeys.has(key), false)
          badCaseKeys.add(key)
          categories.add(item.category)
          assert.ok(item.eventIds.length > 0)
          assert.ok(item.eventIds.every((id) => eventIds.has(id)))
        }
        const overdueMetricTaskIds = new Set(
          run.tasks
            .filter(
              (task) =>
                task.acceptedAt &&
                task.effectiveDueAt <= run.completedAt &&
                (task.status === "overdue" ||
                  !task.submittedAt ||
                  task.submittedAt > task.effectiveDueAt),
            )
            .map((task) => task.id),
        )
        const overdueEventTaskIds = new Set(
          run.events
            .filter((event) => event.eventType === "TASK_OVERDUE")
            .map((event) => event.taskId),
        )
        const overdueBadCaseTaskIds = new Set(
          run.badCases
            .filter((badCase) => badCase.category === "overdue")
            .map((badCase) => badCase.taskId),
        )
        assert.deepEqual(overdueMetricTaskIds, overdueEventTaskIds)
        assert.deepEqual(overdueMetricTaskIds, overdueBadCaseTaskIds)
        assert.equal(
          run.metrics.overdue_rate.numerator,
          overdueMetricTaskIds.size,
        )

        const adoptionReplay = new Map<string, string>()
        for (const event of run.events.filter(
          (event) =>
            event.entityType === "adoption" &&
            (event.eventType === "ADOPTION_CREATED" ||
              event.eventType === "ADOPTION_STATUS_CHANGED"),
        )) {
          const current = adoptionReplay.get(event.entityId)
          if (event.fromStatus) assert.equal(event.fromStatus, current)
          if (event.toStatus) adoptionReplay.set(event.entityId, event.toStatus)
        }
      }
    }
  assert.deepEqual(
    categories,
    new Set([
      "inventory_shortage",
      "assignment_exhausted",
      "overdue",
      "quality_return",
      "review_backlog",
      "rights_delay",
      "anomaly_missed",
    ]),
  )
})

test("export returns eleven artifacts and report starts with the demo disclaimer", () => {
  const pair = runSimulationPair(DEFAULT_SIMULATION_CONFIG, {
    pairId: "export-test",
  })
  const comparison = compareSimulationRuns(pair.v0, pair.v1)
  const artifacts = exportSimulationArtifacts(pair, comparison)
  assert.equal(Object.keys(artifacts).length, 11)
  assert.ok(artifacts["simulation_report.md"].startsWith("# Demo"))
  assert.match(
    artifacts["simulation_report.md"],
    /模拟运营数据，不代表真实业务结果/,
  )
  for (const required of [
    "simulation",
    pair.v0.simulationRunId,
    pair.v1.simulationRunId,
    pair.v0.policyRevision,
    pair.v1.policyRevision,
  ]) {
    assert.match(artifacts["simulation_report.md"], new RegExp(required))
    assert.ok(
      Object.values(artifacts).some((value) => value.includes(required)),
    )
  }
  assert.match(
    artifacts["simulation_events.csv"].split("\n", 1)[0]!,
    /adoptionId,taskId,fromStatus,toStatus/,
  )
  const exportedConfig = JSON.parse(artifacts["simulation_config.json"]) as {
    simulationRunIds?: string[]
    policyVersions?: string[]
  }
  assert.deepEqual(exportedConfig.simulationRunIds, [
    pair.v0.simulationRunId,
    pair.v1.simulationRunId,
  ])
  assert.deepEqual(exportedConfig.policyVersions, ["V0", "V1"])
  for (const value of Object.values(artifacts))
    assert.equal(typeof value, "string")
  const wrongWorld = structuredClone(pair)
  wrongWorld.world.worldHash = "wrong-world"
  assert.throws(
    () => exportSimulationArtifacts(wrongWorld, comparison),
    /world|mismatch|一致/i,
  )
})
