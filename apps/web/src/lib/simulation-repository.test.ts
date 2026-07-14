import assert from "node:assert/strict"
import { access, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  createFileSimulationRepository,
  createMemorySimulationRepository,
  createSimulationRepository,
  createPrismaSimulationRepository,
  defaultSimulationStoreDirectory,
  type SimulationBadCaseRecord,
  type SimulationEventRecord,
  type SimulationRunRecord,
  type SimulationWorldRecord,
} from "./simulation-repository"

const world: SimulationWorldRecord = {
  id: "world-1",
  scenarioId: "NORMAL",
  randomSeed: 20260713,
  config: { seed: 20260713, scenario: "NORMAL" },
  payload: { worldHash: "hash-1" },
  worldHash: "hash-1",
  dataOrigin: "simulation",
  createdAt: "2026-07-13T00:00:00.000Z",
}

const run: SimulationRunRecord = {
  id: "run-v0",
  pairId: "pair-1",
  worldId: world.id,
  runName: "Normal V0",
  policyVersion: "V0",
  policyRevision: "v0.1",
  status: "running",
  result: null,
  metrics: null,
  decision: null,
  errorMessage: null,
  startedAt: "2026-07-13T00:00:00.000Z",
  completedAt: null,
  archivedAt: null,
  dataOrigin: "simulation",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
}

const event: SimulationEventRecord = {
  id: "event-1",
  runId: run.id,
  scenarioId: "NORMAL",
  randomSeed: 20260713,
  eventType: "TASK_ASSIGNED",
  occurredAt: "2026-07-13T01:00:00.000Z",
  adoptionId: "adoption-1",
  taskId: "task-1",
  entityType: "task",
  entityId: "task-1",
  actorId: "villager-1",
  actorType: "villager",
  fromStatus: "created",
  toStatus: "assigned",
  payload: { attempt: 1 },
  dataOrigin: "simulation",
  policyVersion: "V0",
  policyRevision: "v0.1",
  createdAt: "2026-07-13T01:00:00.000Z",
}

const badCase: SimulationBadCaseRecord = {
  id: "bad-1",
  runId: run.id,
  category: "reassignment",
  severity: "medium",
  title: "Repeated assignment",
  description: "Task needed another assignee",
  taskId: "task-1",
  adoptionId: "adoption-1",
  eventIds: [event.id],
  rootCause: null,
  improvementAction: null,
  dataOrigin: "simulation",
  policyVersion: "V0",
  policyRevision: "v0.1",
  createdAt: "2026-07-13T01:00:00.000Z",
  updatedAt: "2026-07-13T01:00:00.000Z",
}

async function seedRepository(
  repository: ReturnType<typeof createMemorySimulationRepository>,
) {
  await repository.createWorld(world)
  await repository.createRun(run)
  await repository.createEvents([event])
  await repository.createBadCases([badCase])
}

test("repository returns an aggregate run detail without touching real business tables", async () => {
  const repository = createMemorySimulationRepository()
  await seedRepository(repository)

  const detail = await repository.getRunDetail(run.id)

  assert.equal(detail?.world.id, world.id)
  assert.deepEqual(detail?.events, [event])
  assert.deepEqual(detail?.badCases, [badCase])
  assert.deepEqual(repository.meta, { backend: "memory", degraded: true })
})

test("a completed run is immutable", async () => {
  const repository = createMemorySimulationRepository()
  await seedRepository(repository)
  await repository.completeRun(run.id, {
    result: { simulationRunId: run.id },
    metrics: { acceptance_rate: { value: 0.8 } },
    decision: "模拟结果暂不支持升级",
    completedAt: "2026-07-13T03:00:00.000Z",
  })

  await assert.rejects(
    repository.completeRun(run.id, {
      result: { simulationRunId: "overwritten" },
      metrics: {},
      decision: "模拟结果建议采用V1",
      completedAt: "2026-07-13T04:00:00.000Z",
    }),
    /immutable/i,
  )
})

test("finalize atomically writes evidence and completion, then rejects later evidence", async () => {
  const repository = createMemorySimulationRepository()
  await repository.createWorld(world)
  await repository.createRun(run)

  await repository.finalizeRun(run.id, [event], [badCase], {
    result: { simulationRunId: run.id },
    metrics: { acceptance_rate: { value: 0.8 } },
    decision: "模拟结果暂不支持升级",
    completedAt: "2026-07-13T03:00:00.000Z",
  })

  const detail = await repository.getRunDetail(run.id)
  assert.equal(detail?.run.status, "completed")
  assert.deepEqual(detail?.events, [event])
  assert.deepEqual(detail?.badCases, [badCase])
  await assert.rejects(
    repository.createEvents([{ ...event, id: "late-event" }]),
    /completed|immutable/i,
  )
  await assert.rejects(
    repository.createBadCases([{ ...badCase, id: "late-bad" }]),
    /completed|immutable/i,
  )
})

test("batch validation rejects duplicate evidence without partially appending", async () => {
  const repository = createMemorySimulationRepository()
  await repository.createWorld(world)
  await repository.createRun(run)
  const duplicate = { ...event, id: "duplicate-event" }

  await assert.rejects(
    repository.createEvents([duplicate, duplicate]),
    /already exists|duplicate/i,
  )

  assert.deepEqual(await repository.listEvents({ runId: run.id }), [])
})

test("failed persistence never contaminates in-memory state", async () => {
  let writes = 0
  const repository = createMemorySimulationRepository(
    undefined,
    undefined,
    async () => {
      writes += 1
      if (writes === 2) throw new Error("disk full")
    },
  )
  await repository.createWorld(world)

  await assert.rejects(repository.createRun(run), /disk full/)

  assert.equal(await repository.getRun(run.id), null)
})

test("failed finalize keeps the run and evidence unchanged", async () => {
  let failWrites = false
  const repository = createMemorySimulationRepository(
    undefined,
    undefined,
    async () => {
      if (failWrites) throw new Error("disk full")
    },
  )
  await repository.createWorld(world)
  await repository.createRun(run)
  failWrites = true

  await assert.rejects(
    repository.finalizeRun(run.id, [event], [badCase], {
      result: { simulationRunId: run.id },
      metrics: {},
      decision: null,
      completedAt: "2026-07-13T03:00:00.000Z",
    }),
    /disk full/,
  )

  const detail = await repository.getRunDetail(run.id)
  assert.equal(detail?.run.status, "running")
  assert.deepEqual(detail?.events, [])
  assert.deepEqual(detail?.badCases, [])
})

test("archive is a soft delete and archived runs are hidden by default", async () => {
  const repository = createMemorySimulationRepository()
  await seedRepository(repository)

  const archived = await repository.archiveRun(
    run.id,
    "2026-07-14T00:00:00.000Z",
  )

  assert.equal(archived.archivedAt, "2026-07-14T00:00:00.000Z")
  assert.deepEqual(await repository.listRuns(), [])
  assert.equal((await repository.listRuns({ includeArchived: true })).length, 1)
  assert.equal((await repository.getRunDetail(run.id))?.events.length, 1)
})

test("run summary pages are stable and exclude complete result evidence", async () => {
  const repository = createMemorySimulationRepository()
  await repository.createWorld(world)
  for (const id of ["run-a", "run-c", "run-b"]) {
    await repository.createRun({
      ...run,
      id,
      runName: id,
      status: "completed",
      result: {
        simulationRunId: id,
        events: Array.from({ length: 1_000 }, (_, index) => ({ index })),
      },
      metrics: { acceptance_rate: { value: 0.8, unit: "rate" } },
    })
  }

  const first = await repository.listRunSummaries({}, { page: 1, pageSize: 2 })
  const second = await repository.listRunSummaries({}, { page: 2, pageSize: 2 })

  assert.deepEqual(
    first.items.map((item) => item.id),
    ["run-c", "run-b"],
  )
  assert.deepEqual(
    second.items.map((item) => item.id),
    ["run-a"],
  )
  assert.equal(first.hasMore, true)
  assert.equal(second.hasMore, false)
  assert.equal("result" in first.items[0]!, false)
  assert.equal("events" in first.items[0]!, false)
  assert.equal(first.items[0]?.worldHash, world.worldHash)
  assert.deepEqual(first.items[0]?.config, world.config)
  assert.deepEqual(first.items[0]?.metrics, {
    acceptance_rate: { value: 0.8, unit: "rate" },
  })
})

test("Prisma run summaries select no result column and fetch one bounded lookahead", async () => {
  let query: Record<string, unknown> | undefined
  const repository = createPrismaSimulationRepository({
    simulationRun: {
      findMany: async (args: Record<string, unknown>) => {
        query = args
        return []
      },
    },
  } as never)

  await repository.listRunSummaries({}, { page: 3, pageSize: 2 })

  const select = query?.select as Record<string, unknown>
  assert.equal(select.result, undefined)
  assert.deepEqual(select.world, {
    select: {
      worldHash: true,
      scenarioId: true,
      randomSeed: true,
      config: true,
    },
  })
  assert.equal(query?.skip, 4)
  assert.equal(query?.take, 3)
  assert.deepEqual(query?.orderBy, [{ createdAt: "desc" }, { id: "desc" }])
})

test("events and bad cases support the management filters and review fields", async () => {
  const repository = createMemorySimulationRepository()
  await seedRepository(repository)

  assert.equal(
    (
      await repository.listEvents({
        taskId: "task-1",
        eventType: "TASK_ASSIGNED",
      })
    ).length,
    1,
  )
  assert.equal(
    (await repository.listEvents({ actorType: "villager" })).length,
    1,
  )
  assert.equal(
    (await repository.listEvents({ actorType: "reviewer" })).length,
    0,
  )
  assert.equal(
    (await repository.listEvents({ actorId: "someone-else" })).length,
    0,
  )

  const updated = await repository.updateBadCase(badCase.id, {
    rootCause: "轮转未考虑距离",
    improvementAction: "改为综合匹配",
  })
  assert.equal(updated.rootCause, "轮转未考虑距离")
  assert.equal(
    (await repository.listBadCases({ runId: run.id }))[0]?.improvementAction,
    "改为综合匹配",
  )
})

test("file repository reloads the same DTOs from JSON", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "simulation-repository-"),
  )
  try {
    const first = await createFileSimulationRepository(directory)
    await first.createWorld(world)
    await first.createRun(run)
    await first.createEvents([event])
    await first.createBadCases([badCase])

    const second = await createFileSimulationRepository(directory)
    assert.deepEqual(
      await second.getRunDetail(run.id),
      await first.getRunDetail(run.id),
    )
    assert.deepEqual(second.meta, { backend: "json", degraded: true })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("two file repository instances serialize 30 concurrent mutations without loss", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "simulation-concurrency-"),
  )
  try {
    const first = await createFileSimulationRepository(directory)
    await first.createWorld(world)
    const second = await createFileSimulationRepository(directory)
    const records = Array.from(
      { length: 30 },
      (_, index): SimulationRunRecord => ({
        ...run,
        id: `concurrent-run-${index}`,
        pairId: null,
        runName: `Concurrent ${index}`,
      }),
    )

    await Promise.all(
      records.map((record, index) =>
        (index % 2 === 0 ? first : second).createRun(record),
      ),
    )

    const reloaded = await createFileSimulationRepository(directory)
    assert.equal((await reloaded.listRuns()).length, 30)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("invalid event dates are rejected consistently before memory, JSON, or Prisma queries", async () => {
  const memory = createMemorySimulationRepository()
  await assert.rejects(memory.listEvents({ from: "not-a-date" }), /valid date/i)

  const directory = await mkdtemp(path.join(os.tmpdir(), "simulation-date-"))
  try {
    const file = await createFileSimulationRepository(directory)
    await assert.rejects(file.listEvents({ to: "not-a-date" }), /valid date/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }

  let queried = false
  const prismaRepository = createPrismaSimulationRepository({
    simulationEvent: {
      findMany: async () => {
        queried = true
        return []
      },
    },
  } as never)
  await assert.rejects(
    prismaRepository.listEvents({ from: "not-a-date" }),
    /valid date/i,
  )
  assert.equal(queried, false)
})

test("default JSON store is anchored at the monorepo root", () => {
  assert.equal(
    defaultSimulationStoreDirectory(),
    path.resolve(import.meta.dirname, "../../../..", "tmp/simulation-store"),
  )
})

test("repository factory falls back from Prisma to JSON and reports degraded mode", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "simulation-fallback-"),
  )
  try {
    const repository = await createSimulationRepository({
      prismaProbe: async () => {
        throw new Error("database unavailable")
      },
      fileDirectory: directory,
    })

    assert.equal(repository.meta.backend, "json")
    assert.equal(repository.meta.degraded, true)
    assert.match(repository.meta.reason ?? "", /database unavailable/)
    await access(path.join(directory, "store.json"))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("repository factory falls back to memory when both Prisma and JSON are unavailable", async () => {
  const repository = await createSimulationRepository({
    prismaProbe: async () => {
      throw new Error("database unavailable")
    },
    fileDirectory: "/dev/null/simulation-store",
  })

  assert.equal(repository.meta.backend, "memory")
  assert.equal(repository.meta.degraded, true)
  assert.match(repository.meta.reason ?? "", /database unavailable/)
})
