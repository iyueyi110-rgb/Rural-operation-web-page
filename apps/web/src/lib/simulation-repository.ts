import { randomUUID } from "node:crypto"
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

import type { SimulationRecommendation } from "@zouma/contracts"
import { prisma, type Prisma, type PrismaClient } from "@zouma/database"

export type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface SimulationRepositoryMeta {
  backend: "prisma" | "json" | "memory"
  degraded: boolean
  reason?: string
}

export class SimulationRepositoryInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SimulationRepositoryInputError"
  }
}

export class SimulationRepositoryNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SimulationRepositoryNotFoundError"
  }
}

export interface SimulationWorldRecord {
  id: string
  scenarioId: string
  randomSeed: number
  config: JsonValue
  payload: JsonValue
  worldHash: string
  dataOrigin: "simulation"
  createdAt: string
}

export interface SimulationRunRecord {
  id: string
  pairId: string | null
  worldId: string
  runName: string
  policyVersion: "V0" | "V1"
  policyRevision: string
  status: "pending" | "running" | "completed" | "failed"
  result: JsonValue | null
  metrics: JsonValue | null
  decision: SimulationRecommendation | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  archivedAt: string | null
  dataOrigin: "simulation"
  createdAt: string
  updatedAt: string
}

export interface SimulationEventRecord {
  id: string
  runId: string
  scenarioId: string
  randomSeed: number
  eventType: string
  occurredAt: string
  adoptionId: string | null
  taskId: string | null
  entityType: string | null
  entityId: string | null
  actorId: string | null
  actorType: string
  fromStatus: string | null
  toStatus: string | null
  payload: JsonValue | null
  dataOrigin: "simulation"
  policyVersion: "V0" | "V1"
  policyRevision: string
  createdAt: string
}

export interface SimulationBadCaseRecord {
  id: string
  runId: string
  category: string
  severity: string
  title: string
  description: string
  taskId: string | null
  adoptionId: string | null
  eventIds: string[]
  rootCause: string | null
  improvementAction: string | null
  dataOrigin: "simulation"
  policyVersion: "V0" | "V1"
  policyRevision: string
  createdAt: string
  updatedAt: string
}

export interface SimulationRunDetail {
  world: SimulationWorldRecord
  run: SimulationRunRecord
  events: SimulationEventRecord[]
  badCases: SimulationBadCaseRecord[]
}

export interface RunFilters {
  pairId?: string
  policyVersion?: "V0" | "V1"
  scenarioId?: string
  status?: SimulationRunRecord["status"]
  includeArchived?: boolean
}

export interface RunPage {
  page: number
  pageSize: number
}

export interface SimulationRunSummary extends Omit<
  SimulationRunRecord,
  "result"
> {
  worldHash: string
  scenarioId: string
  randomSeed: number
  config: JsonValue
}

export interface SimulationRunSummaryPage {
  items: SimulationRunSummary[]
  hasMore: boolean
}

export interface EventFilters {
  runId?: string
  scenarioId?: string
  randomSeed?: number
  adoptionId?: string
  taskId?: string
  entityType?: string
  entityId?: string
  actorId?: string
  actorType?: string
  eventType?: string
  policyVersion?: "V0" | "V1"
  from?: string
  to?: string
}

export interface BadCaseFilters {
  runId?: string
  category?: string
  severity?: string
  policyVersion?: "V0" | "V1"
}

export interface SimulationRepository {
  readonly meta: SimulationRepositoryMeta
  createWorld(record: SimulationWorldRecord): Promise<SimulationWorldRecord>
  createRun(record: SimulationRunRecord): Promise<SimulationRunRecord>
  createEvents(
    records: SimulationEventRecord[],
  ): Promise<SimulationEventRecord[]>
  createBadCases(
    records: SimulationBadCaseRecord[],
  ): Promise<SimulationBadCaseRecord[]>
  finalizeRun(
    id: string,
    events: SimulationEventRecord[],
    badCases: SimulationBadCaseRecord[],
    completion: Pick<
      SimulationRunRecord,
      "result" | "metrics" | "decision" | "completedAt"
    >,
  ): Promise<SimulationRunRecord>
  completeRun(
    id: string,
    completion: Pick<
      SimulationRunRecord,
      "result" | "metrics" | "decision" | "completedAt"
    >,
  ): Promise<SimulationRunRecord>
  failRun(
    id: string,
    errorMessage: string,
    completedAt: string,
  ): Promise<SimulationRunRecord>
  getWorld(id: string): Promise<SimulationWorldRecord | null>
  getRun(id: string): Promise<SimulationRunRecord | null>
  getRunDetail(id: string): Promise<SimulationRunDetail | null>
  listRuns(filters?: RunFilters): Promise<SimulationRunRecord[]>
  listRunSummaries(
    filters: RunFilters | undefined,
    pagination: RunPage,
  ): Promise<SimulationRunSummaryPage>
  archiveRun(id: string, archivedAt: string): Promise<SimulationRunRecord>
  listEvents(filters?: EventFilters): Promise<SimulationEventRecord[]>
  listBadCases(filters?: BadCaseFilters): Promise<SimulationBadCaseRecord[]>
  updateBadCase(
    id: string,
    patch: Pick<SimulationBadCaseRecord, "rootCause" | "improvementAction">,
  ): Promise<SimulationBadCaseRecord>
}

interface RepositoryState {
  worlds: SimulationWorldRecord[]
  runs: SimulationRunRecord[]
  events: SimulationEventRecord[]
  badCases: SimulationBadCaseRecord[]
}

const emptyState = (): RepositoryState => ({
  worlds: [],
  runs: [],
  events: [],
  badCases: [],
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isRepositoryState(value: unknown): value is RepositoryState {
  if (!isRecord(value)) return false
  const keys = ["worlds", "runs", "events", "badCases"] as const
  return keys.every(
    (key) =>
      Array.isArray(value[key]) &&
      value[key].every(
        (record) => isRecord(record) && typeof record.id === "string",
      ),
  )
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function boundedPage({ page, pageSize }: RunPage): RunPage {
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isSafeInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, 100)
        : 25,
  }
}

function summarizeRun(
  run: SimulationRunRecord,
  world: SimulationWorldRecord,
): SimulationRunSummary {
  const { result: _result, ...summary } = run
  return {
    ...summary,
    worldHash: world.worldHash,
    scenarioId: world.scenarioId,
    randomSeed: world.randomSeed,
    config: clone(world.config),
  }
}

function assertUnique(
  records: Array<{ id: string }>,
  id: string,
  kind: string,
) {
  if (records.some((record) => record.id === id))
    throw new Error(`${kind} ${id} already exists`)
}

type Completion = Pick<
  SimulationRunRecord,
  "result" | "metrics" | "decision" | "completedAt"
>

interface StateDriver {
  snapshot(): Promise<RepositoryState>
  commit<T>(mutate: (draft: RepositoryState) => T): Promise<T>
}

function validDate(value: string | null, field: string) {
  if (value !== null && Number.isNaN(Date.parse(value))) {
    throw new SimulationRepositoryInputError(`${field} must be a valid date`)
  }
}

function dateBound(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined) return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed))
    throw new SimulationRepositoryInputError(`${field} must be a valid date`)
  return parsed
}

function validateWorld(record: SimulationWorldRecord) {
  validDate(record.createdAt, "world.createdAt")
}

function validateRun(record: SimulationRunRecord) {
  validDate(record.startedAt, "run.startedAt")
  validDate(record.completedAt, "run.completedAt")
  validDate(record.archivedAt, "run.archivedAt")
  validDate(record.createdAt, "run.createdAt")
  validDate(record.updatedAt, "run.updatedAt")
}

function validateEvent(record: SimulationEventRecord) {
  validDate(record.occurredAt, "event.occurredAt")
  validDate(record.createdAt, "event.createdAt")
}

function validateBadCase(record: SimulationBadCaseRecord) {
  validDate(record.createdAt, "badCase.createdAt")
  validDate(record.updatedAt, "badCase.updatedAt")
}

function validateCompletion(completion: Completion) {
  validDate(completion.completedAt, "completion.completedAt")
}

function requireRun(state: RepositoryState, id: string) {
  const record = state.runs.find((item) => item.id === id)
  if (!record)
    throw new SimulationRepositoryNotFoundError(
      `Simulation run ${id} not found`,
    )
  return record
}

function assertEvidenceWritable(run: { id: string; status: string }) {
  if (run.status === "completed") {
    throw new Error(`Completed simulation run ${run.id} is immutable`)
  }
}

function assertBatchUnique(
  existing: Array<{ id: string }>,
  incoming: Array<{ id: string }>,
  kind: string,
) {
  const ids = new Set(existing.map((record) => record.id))
  for (const record of incoming) {
    if (ids.has(record.id))
      throw new Error(`${kind} ${record.id} already exists or is duplicated`)
    ids.add(record.id)
  }
}

function applyCompletion(record: SimulationRunRecord, completion: Completion) {
  record.status = "completed"
  record.result = clone(completion.result)
  record.metrics = clone(completion.metrics)
  record.decision = completion.decision
  record.completedAt = completion.completedAt
  record.updatedAt = completion.completedAt ?? record.updatedAt
}

function createStateRepository(
  driver: StateDriver,
  meta: SimulationRepositoryMeta,
): SimulationRepository {
  return {
    meta,
    async createWorld(record) {
      validateWorld(record)
      return driver.commit((draft) => {
        assertUnique(draft.worlds, record.id, "Simulation world")
        draft.worlds.push(clone(record))
        return clone(record)
      })
    },
    async createRun(record) {
      validateRun(record)
      return driver.commit((draft) => {
        assertUnique(draft.runs, record.id, "Simulation run")
        if (!draft.worlds.some((world) => world.id === record.worldId)) {
          throw new SimulationRepositoryNotFoundError(
            `Simulation world ${record.worldId} not found`,
          )
        }
        draft.runs.push(clone(record))
        return clone(record)
      })
    },
    async createEvents(records) {
      records.forEach(validateEvent)
      return driver.commit((draft) => {
        assertBatchUnique(draft.events, records, "Simulation event")
        for (const record of records)
          assertEvidenceWritable(requireRun(draft, record.runId))
        draft.events.push(...clone(records))
        return clone(records)
      })
    },
    async createBadCases(records) {
      records.forEach(validateBadCase)
      return driver.commit((draft) => {
        assertBatchUnique(draft.badCases, records, "Simulation bad case")
        for (const record of records)
          assertEvidenceWritable(requireRun(draft, record.runId))
        draft.badCases.push(...clone(records))
        return clone(records)
      })
    },
    async finalizeRun(id, events, badCases, completion) {
      events.forEach(validateEvent)
      badCases.forEach(validateBadCase)
      validateCompletion(completion)
      if (
        events.some((record) => record.runId !== id) ||
        badCases.some((record) => record.runId !== id)
      ) {
        throw new SimulationRepositoryInputError(
          "Finalized evidence must belong to the same run",
        )
      }
      return driver.commit((draft) => {
        const record = requireRun(draft, id)
        assertEvidenceWritable(record)
        assertBatchUnique(draft.events, events, "Simulation event")
        assertBatchUnique(draft.badCases, badCases, "Simulation bad case")
        draft.events.push(...clone(events))
        draft.badCases.push(...clone(badCases))
        applyCompletion(record, completion)
        return clone(record)
      })
    },
    async completeRun(id, completion) {
      validateCompletion(completion)
      return driver.commit((draft) => {
        const record = requireRun(draft, id)
        assertEvidenceWritable(record)
        applyCompletion(record, completion)
        return clone(record)
      })
    },
    async failRun(id, errorMessage, completedAt) {
      validDate(completedAt, "run.completedAt")
      return driver.commit((draft) => {
        const record = requireRun(draft, id)
        assertEvidenceWritable(record)
        record.status = "failed"
        record.errorMessage = errorMessage
        record.completedAt = completedAt
        record.updatedAt = completedAt
        return clone(record)
      })
    },
    async getWorld(id) {
      const state = await driver.snapshot()
      const record = state.worlds.find((item) => item.id === id)
      return record ? clone(record) : null
    },
    async getRun(id) {
      const state = await driver.snapshot()
      const record = state.runs.find((item) => item.id === id)
      return record ? clone(record) : null
    },
    async getRunDetail(id) {
      const state = await driver.snapshot()
      const run = state.runs.find((item) => item.id === id)
      if (!run) return null
      const world = state.worlds.find((item) => item.id === run.worldId)
      if (!world)
        throw new SimulationRepositoryNotFoundError(
          `Simulation world ${run.worldId} not found`,
        )
      return clone({
        world,
        run,
        events: state.events.filter((event) => event.runId === id),
        badCases: state.badCases.filter((item) => item.runId === id),
      })
    },
    async listRuns(filters = {}) {
      const state = await driver.snapshot()
      return clone(
        state.runs
          .filter((record) => filters.includeArchived || !record.archivedAt)
          .filter(
            (record) => !filters.pairId || record.pairId === filters.pairId,
          )
          .filter(
            (record) =>
              !filters.policyVersion ||
              record.policyVersion === filters.policyVersion,
          )
          .filter(
            (record) => !filters.status || record.status === filters.status,
          )
          .filter((record) => {
            if (!filters.scenarioId) return true
            return state.worlds.some(
              (world) =>
                world.id === record.worldId &&
                world.scenarioId === filters.scenarioId,
            )
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
    },
    async listRunSummaries(filters = {}, pagination) {
      const { page, pageSize } = boundedPage(pagination)
      const state = await driver.snapshot()
      const summaries = state.runs
        .filter((record) => filters.includeArchived || !record.archivedAt)
        .filter((record) => !filters.pairId || record.pairId === filters.pairId)
        .filter(
          (record) =>
            !filters.policyVersion ||
            record.policyVersion === filters.policyVersion,
        )
        .filter((record) => !filters.status || record.status === filters.status)
        .flatMap((record) => {
          const world = state.worlds.find((item) => item.id === record.worldId)
          if (!world) return []
          if (filters.scenarioId && world.scenarioId !== filters.scenarioId) {
            return []
          }
          return [summarizeRun(record, world)]
        })
        .sort(
          (left, right) =>
            right.createdAt.localeCompare(left.createdAt) ||
            right.id.localeCompare(left.id),
        )
      const offset = (page - 1) * pageSize
      const window = summaries.slice(offset, offset + pageSize + 1)
      return clone({
        items: window.slice(0, pageSize),
        hasMore: window.length > pageSize,
      })
    },
    async archiveRun(id, archivedAt) {
      validDate(archivedAt, "run.archivedAt")
      return driver.commit((draft) => {
        const record = requireRun(draft, id)
        record.archivedAt = archivedAt
        record.updatedAt = archivedAt
        return clone(record)
      })
    },
    async listEvents(filters = {}) {
      const from = dateBound(filters.from, "from")
      const to = dateBound(filters.to, "to")
      const state = await driver.snapshot()
      return clone(
        state.events
          .filter((record) => !filters.runId || record.runId === filters.runId)
          .filter(
            (record) =>
              !filters.scenarioId || record.scenarioId === filters.scenarioId,
          )
          .filter(
            (record) =>
              filters.randomSeed === undefined ||
              record.randomSeed === filters.randomSeed,
          )
          .filter(
            (record) =>
              !filters.adoptionId || record.adoptionId === filters.adoptionId,
          )
          .filter(
            (record) => !filters.taskId || record.taskId === filters.taskId,
          )
          .filter(
            (record) =>
              !filters.entityType || record.entityType === filters.entityType,
          )
          .filter(
            (record) =>
              !filters.entityId || record.entityId === filters.entityId,
          )
          .filter(
            (record) => !filters.actorId || record.actorId === filters.actorId,
          )
          .filter(
            (record) =>
              !filters.actorType || record.actorType === filters.actorType,
          )
          .filter(
            (record) =>
              !filters.eventType || record.eventType === filters.eventType,
          )
          .filter(
            (record) =>
              !filters.policyVersion ||
              record.policyVersion === filters.policyVersion,
          )
          .filter(
            (record) =>
              from === undefined || Date.parse(record.occurredAt) >= from,
          )
          .filter(
            (record) => to === undefined || Date.parse(record.occurredAt) <= to,
          )
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
      )
    },
    async listBadCases(filters = {}) {
      const state = await driver.snapshot()
      return clone(
        state.badCases
          .filter((record) => !filters.runId || record.runId === filters.runId)
          .filter(
            (record) =>
              !filters.category || record.category === filters.category,
          )
          .filter(
            (record) =>
              !filters.severity || record.severity === filters.severity,
          )
          .filter(
            (record) =>
              !filters.policyVersion ||
              record.policyVersion === filters.policyVersion,
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
    },
    async updateBadCase(id, patch) {
      return driver.commit((draft) => {
        const record = draft.badCases.find((item) => item.id === id)
        if (!record)
          throw new SimulationRepositoryNotFoundError(
            `Simulation bad case ${id} not found`,
          )
        record.rootCause = patch.rootCause
        record.improvementAction = patch.improvementAction
        record.updatedAt = new Date().toISOString()
        return clone(record)
      })
    },
  }
}

function memoryDriver(
  initialState: RepositoryState,
  persist: (candidate: RepositoryState) => Promise<void>,
): StateDriver {
  let state = clone(initialState)
  let queue = Promise.resolve()
  return {
    async snapshot() {
      await queue
      return clone(state)
    },
    commit<T>(mutate: (draft: RepositoryState) => T) {
      const operation = queue.then(async () => {
        const draft = clone(state)
        const result = mutate(draft)
        await persist(clone(draft))
        state = draft
        return clone(result)
      })
      queue = operation.then(
        () => undefined,
        () => undefined,
      )
      return operation
    },
  }
}

export function createMemorySimulationRepository(
  initialState: RepositoryState = emptyState(),
  reason?: string,
  persist: (candidate: RepositoryState) => Promise<void> = async () => {},
): SimulationRepository {
  return createStateRepository(memoryDriver(initialState, persist), {
    backend: "memory",
    degraded: true,
    ...(reason ? { reason } : {}),
  })
}

async function readStore(filePath: string): Promise<RepositoryState> {
  try {
    const stored = JSON.parse(await readFile(filePath, "utf8")) as unknown
    if (!isRepositoryState(stored))
      throw new Error("Simulation JSON store is invalid")
    return stored
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState()
    throw error
  }
}

async function writeStore(filePath: string, state: RepositoryState) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8")
    await rename(temporaryPath, filePath)
  } finally {
    await unlink(temporaryPath).catch(() => undefined)
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function withFileLock<T>(
  lockPath: string,
  action: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    let handle
    try {
      handle = await open(lockPath, "wx")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      const lockStat = await stat(lockPath).catch(() => null)
      if (lockStat && Date.now() - lockStat.mtimeMs > 30_000) {
        await unlink(lockPath).catch(() => undefined)
      }
      await delay(5)
      continue
    }
    try {
      return await action()
    } finally {
      await handle.close()
      await unlink(lockPath).catch(() => undefined)
    }
  }
  throw new Error("Timed out waiting for simulation store lock")
}

function fileDriver(filePath: string, lockPath: string): StateDriver {
  let queue = Promise.resolve()
  return {
    snapshot: () => readStore(filePath),
    commit<T>(mutate: (draft: RepositoryState) => T) {
      const operation = queue.then(() =>
        withFileLock(lockPath, async () => {
          const draft = clone(await readStore(filePath))
          const result = mutate(draft)
          await writeStore(filePath, draft)
          return clone(result)
        }),
      )
      queue = operation.then(
        () => undefined,
        () => undefined,
      )
      return operation
    },
  }
}

export function defaultSimulationStoreDirectory() {
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  )
  return path.join(repositoryRoot, "tmp/simulation-store")
}

export async function createFileSimulationRepository(
  directory: string,
  reason?: string,
): Promise<SimulationRepository> {
  await mkdir(directory, { recursive: true })
  const filePath = path.join(directory, "store.json")
  const lockPath = path.join(directory, "store.lock")
  await withFileLock(lockPath, async () =>
    writeStore(filePath, await readStore(filePath)),
  )
  return createStateRepository(fileDriver(filePath, lockPath), {
    backend: "json",
    degraded: true,
    ...(reason ? { reason } : {}),
  })
}

function inputJson(value: JsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function outputJson(value: Prisma.JsonValue): JsonValue {
  return value as JsonValue
}

function mapWorld(record: {
  id: string
  scenarioId: string
  randomSeed: number
  config: Prisma.JsonValue
  payload: Prisma.JsonValue
  worldHash: string
  dataOrigin: string
  createdAt: Date
}): SimulationWorldRecord {
  return {
    id: record.id,
    scenarioId: record.scenarioId,
    randomSeed: record.randomSeed,
    config: outputJson(record.config),
    payload: outputJson(record.payload),
    worldHash: record.worldHash,
    dataOrigin: "simulation",
    createdAt: record.createdAt.toISOString(),
  }
}

function mapRun(record: {
  id: string
  pairId: string | null
  worldId: string
  runName: string
  policyVersion: string
  policyRevision: string
  status: string
  result: Prisma.JsonValue | null
  metrics: Prisma.JsonValue | null
  decision: string | null
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  archivedAt: Date | null
  dataOrigin: string
  createdAt: Date
  updatedAt: Date
}): SimulationRunRecord {
  return {
    id: record.id,
    pairId: record.pairId,
    worldId: record.worldId,
    runName: record.runName,
    policyVersion: record.policyVersion as SimulationRunRecord["policyVersion"],
    policyRevision: record.policyRevision,
    status: record.status as SimulationRunRecord["status"],
    result: record.result === null ? null : outputJson(record.result),
    metrics: record.metrics === null ? null : outputJson(record.metrics),
    decision: record.decision as SimulationRecommendation | null,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    dataOrigin: "simulation",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapEvent(record: {
  id: string
  runId: string
  scenarioId: string
  randomSeed: number
  eventType: string
  occurredAt: Date
  adoptionId: string | null
  taskId: string | null
  entityType: string | null
  entityId: string | null
  actorId: string | null
  actorType: string
  fromStatus: string | null
  toStatus: string | null
  payload: Prisma.JsonValue | null
  dataOrigin: string
  policyVersion: string
  policyRevision: string
  createdAt: Date
}): SimulationEventRecord {
  return {
    ...record,
    occurredAt: record.occurredAt.toISOString(),
    payload: record.payload === null ? null : outputJson(record.payload),
    dataOrigin: "simulation",
    policyVersion:
      record.policyVersion as SimulationEventRecord["policyVersion"],
    createdAt: record.createdAt.toISOString(),
  }
}

function mapBadCase(record: {
  id: string
  runId: string
  category: string
  severity: string
  title: string
  description: string
  taskId: string | null
  adoptionId: string | null
  eventIds: Prisma.JsonValue
  rootCause: string | null
  improvementAction: string | null
  dataOrigin: string
  policyVersion: string
  policyRevision: string
  createdAt: Date
  updatedAt: Date
}): SimulationBadCaseRecord {
  return {
    ...record,
    eventIds: Array.isArray(record.eventIds)
      ? record.eventIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    dataOrigin: "simulation",
    policyVersion:
      record.policyVersion as SimulationBadCaseRecord["policyVersion"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function worldCreateData(
  record: SimulationWorldRecord,
): Prisma.SimulationWorldCreateInput {
  return {
    id: record.id,
    scenarioId: record.scenarioId,
    randomSeed: record.randomSeed,
    config: inputJson(record.config),
    payload: inputJson(record.payload),
    worldHash: record.worldHash,
    dataOrigin: record.dataOrigin,
    createdAt: new Date(record.createdAt),
  }
}

function runCreateData(
  record: SimulationRunRecord,
): Prisma.SimulationRunUncheckedCreateInput {
  return {
    id: record.id,
    pairId: record.pairId,
    worldId: record.worldId,
    runName: record.runName,
    policyVersion: record.policyVersion,
    policyRevision: record.policyRevision,
    status: record.status,
    result: record.result === null ? undefined : inputJson(record.result),
    metrics: record.metrics === null ? undefined : inputJson(record.metrics),
    decision: record.decision,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt ? new Date(record.startedAt) : null,
    completedAt: record.completedAt ? new Date(record.completedAt) : null,
    archivedAt: record.archivedAt ? new Date(record.archivedAt) : null,
    dataOrigin: record.dataOrigin,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

function eventCreateData(
  record: SimulationEventRecord,
): Prisma.SimulationEventUncheckedCreateInput {
  return {
    ...record,
    occurredAt: new Date(record.occurredAt),
    payload: record.payload === null ? undefined : inputJson(record.payload),
    createdAt: new Date(record.createdAt),
  }
}

function badCaseCreateData(
  record: SimulationBadCaseRecord,
): Prisma.SimulationBadCaseUncheckedCreateInput {
  return {
    ...record,
    eventIds: inputJson(record.eventIds),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

export function createPrismaSimulationRepository(
  client: PrismaClient = prisma,
): SimulationRepository {
  const requireRun = async (id: string) => {
    const record = await client.simulationRun.findUnique({ where: { id } })
    if (!record)
      throw new SimulationRepositoryNotFoundError(
        `Simulation run ${id} not found`,
      )
    return record
  }

  return {
    meta: { backend: "prisma", degraded: false },
    async createWorld(record) {
      validateWorld(record)
      return mapWorld(
        await client.simulationWorld.create({ data: worldCreateData(record) }),
      )
    },
    async createRun(record) {
      validateRun(record)
      return mapRun(
        await client.simulationRun.create({ data: runCreateData(record) }),
      )
    },
    async createEvents(records) {
      if (records.length === 0) return []
      records.forEach(validateEvent)
      assertBatchUnique([], records, "Simulation event")
      await client.$transaction(
        async (transaction) => {
          const runIds = [...new Set(records.map((record) => record.runId))]
          const runs = await transaction.simulationRun.findMany({
            where: { id: { in: runIds } },
            select: { id: true, status: true },
          })
          if (runs.length !== runIds.length)
            throw new SimulationRepositoryNotFoundError(
              "Simulation run not found",
            )
          runs.forEach(assertEvidenceWritable)
          await transaction.simulationEvent.createMany({
            data: records.map(eventCreateData),
          })
        },
        { isolationLevel: "Serializable" },
      )
      return clone(records)
    },
    async createBadCases(records) {
      if (records.length === 0) return []
      records.forEach(validateBadCase)
      assertBatchUnique([], records, "Simulation bad case")
      await client.$transaction(
        async (transaction) => {
          const runIds = [...new Set(records.map((record) => record.runId))]
          const runs = await transaction.simulationRun.findMany({
            where: { id: { in: runIds } },
            select: { id: true, status: true },
          })
          if (runs.length !== runIds.length)
            throw new SimulationRepositoryNotFoundError(
              "Simulation run not found",
            )
          runs.forEach(assertEvidenceWritable)
          await transaction.simulationBadCase.createMany({
            data: records.map(badCaseCreateData),
          })
        },
        { isolationLevel: "Serializable" },
      )
      return clone(records)
    },
    async finalizeRun(id, events, badCases, completion) {
      events.forEach(validateEvent)
      badCases.forEach(validateBadCase)
      validateCompletion(completion)
      if (
        events.some((record) => record.runId !== id) ||
        badCases.some((record) => record.runId !== id)
      ) {
        throw new SimulationRepositoryInputError(
          "Finalized evidence must belong to the same run",
        )
      }
      assertBatchUnique([], events, "Simulation event")
      assertBatchUnique([], badCases, "Simulation bad case")
      return client.$transaction(
        async (transaction) => {
          const existing = await transaction.simulationRun.findUnique({
            where: { id },
          })
          if (!existing)
            throw new SimulationRepositoryNotFoundError(
              `Simulation run ${id} not found`,
            )
          assertEvidenceWritable(existing)
          if (events.length > 0) {
            await transaction.simulationEvent.createMany({
              data: events.map(eventCreateData),
            })
          }
          if (badCases.length > 0) {
            await transaction.simulationBadCase.createMany({
              data: badCases.map(badCaseCreateData),
            })
          }
          const changed = await transaction.simulationRun.updateMany({
            where: { id, status: { not: "completed" } },
            data: {
              status: "completed",
              result:
                completion.result === null
                  ? undefined
                  : inputJson(completion.result),
              metrics:
                completion.metrics === null
                  ? undefined
                  : inputJson(completion.metrics),
              decision: completion.decision,
              completedAt: completion.completedAt
                ? new Date(completion.completedAt)
                : null,
            },
          })
          if (changed.count !== 1)
            throw new Error(`Completed simulation run ${id} is immutable`)
          return mapRun(
            (await transaction.simulationRun.findUnique({ where: { id } }))!,
          )
        },
        { isolationLevel: "Serializable" },
      )
    },
    async completeRun(id, completion) {
      validateCompletion(completion)
      const changed = await client.simulationRun.updateMany({
        where: { id, status: { not: "completed" } },
        data: {
          status: "completed",
          result:
            completion.result === null
              ? undefined
              : inputJson(completion.result),
          metrics:
            completion.metrics === null
              ? undefined
              : inputJson(completion.metrics),
          decision: completion.decision,
          completedAt: completion.completedAt
            ? new Date(completion.completedAt)
            : null,
        },
      })
      if (changed.count === 0) {
        const existing = await requireRun(id)
        if (existing.status === "completed")
          throw new Error(`Completed simulation run ${id} is immutable`)
      }
      return mapRun(await requireRun(id))
    },
    async failRun(id, errorMessage, completedAt) {
      validDate(completedAt, "run.completedAt")
      const changed = await client.simulationRun.updateMany({
        where: { id, status: { not: "completed" } },
        data: {
          status: "failed",
          errorMessage,
          completedAt: new Date(completedAt),
        },
      })
      if (changed.count === 0) {
        const existing = await requireRun(id)
        if (existing.status === "completed")
          throw new Error(`Completed simulation run ${id} is immutable`)
      }
      return mapRun(await requireRun(id))
    },
    async getWorld(id) {
      const record = await client.simulationWorld.findUnique({ where: { id } })
      return record ? mapWorld(record) : null
    },
    async getRun(id) {
      const record = await client.simulationRun.findUnique({ where: { id } })
      return record ? mapRun(record) : null
    },
    async getRunDetail(id) {
      const record = await client.simulationRun.findUnique({
        where: { id },
        include: {
          world: true,
          events: { orderBy: { occurredAt: "asc" } },
          badCases: { orderBy: { createdAt: "desc" } },
        },
      })
      if (!record) return null
      return {
        world: mapWorld(record.world),
        run: mapRun(record),
        events: record.events.map(mapEvent),
        badCases: record.badCases.map(mapBadCase),
      }
    },
    async listRuns(filters = {}) {
      const records = await client.simulationRun.findMany({
        where: {
          ...(filters.includeArchived ? {} : { archivedAt: null }),
          ...(filters.pairId ? { pairId: filters.pairId } : {}),
          ...(filters.policyVersion
            ? { policyVersion: filters.policyVersion }
            : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.scenarioId
            ? { world: { scenarioId: filters.scenarioId } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      })
      return records.map(mapRun)
    },
    async listRunSummaries(filters = {}, pagination) {
      const { page, pageSize } = boundedPage(pagination)
      const records = await client.simulationRun.findMany({
        where: {
          ...(filters.includeArchived ? {} : { archivedAt: null }),
          ...(filters.pairId ? { pairId: filters.pairId } : {}),
          ...(filters.policyVersion
            ? { policyVersion: filters.policyVersion }
            : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.scenarioId
            ? { world: { scenarioId: filters.scenarioId } }
            : {}),
        },
        select: {
          id: true,
          pairId: true,
          worldId: true,
          runName: true,
          policyVersion: true,
          policyRevision: true,
          status: true,
          metrics: true,
          decision: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          archivedAt: true,
          dataOrigin: true,
          createdAt: true,
          updatedAt: true,
          world: {
            select: {
              worldHash: true,
              scenarioId: true,
              randomSeed: true,
              config: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize + 1,
      })
      return {
        items: records.slice(0, pageSize).map((record) => ({
          id: record.id,
          pairId: record.pairId,
          worldId: record.worldId,
          runName: record.runName,
          policyVersion:
            record.policyVersion as SimulationRunRecord["policyVersion"],
          policyRevision: record.policyRevision,
          status: record.status as SimulationRunRecord["status"],
          metrics: record.metrics === null ? null : outputJson(record.metrics),
          decision: record.decision as SimulationRecommendation | null,
          errorMessage: record.errorMessage,
          startedAt: record.startedAt?.toISOString() ?? null,
          completedAt: record.completedAt?.toISOString() ?? null,
          archivedAt: record.archivedAt?.toISOString() ?? null,
          dataOrigin: "simulation",
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          worldHash: record.world.worldHash,
          scenarioId: record.world.scenarioId,
          randomSeed: record.world.randomSeed,
          config: outputJson(record.world.config),
        })),
        hasMore: records.length > pageSize,
      }
    },
    async archiveRun(id, archivedAt) {
      validDate(archivedAt, "run.archivedAt")
      await requireRun(id)
      return mapRun(
        await client.simulationRun.update({
          where: { id },
          data: { archivedAt: new Date(archivedAt) },
        }),
      )
    },
    async listEvents(filters = {}) {
      const from = dateBound(filters.from, "from")
      const to = dateBound(filters.to, "to")
      const records = await client.simulationEvent.findMany({
        where: {
          ...(filters.runId ? { runId: filters.runId } : {}),
          ...(filters.scenarioId ? { scenarioId: filters.scenarioId } : {}),
          ...(filters.randomSeed === undefined
            ? {}
            : { randomSeed: filters.randomSeed }),
          ...(filters.adoptionId ? { adoptionId: filters.adoptionId } : {}),
          ...(filters.taskId ? { taskId: filters.taskId } : {}),
          ...(filters.entityType ? { entityType: filters.entityType } : {}),
          ...(filters.entityId ? { entityId: filters.entityId } : {}),
          ...(filters.actorId ? { actorId: filters.actorId } : {}),
          ...(filters.actorType ? { actorType: filters.actorType } : {}),
          ...(filters.eventType ? { eventType: filters.eventType } : {}),
          ...(filters.policyVersion
            ? { policyVersion: filters.policyVersion }
            : {}),
          ...(from !== undefined || to !== undefined
            ? {
                occurredAt: {
                  ...(from !== undefined ? { gte: new Date(from) } : {}),
                  ...(to !== undefined ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { occurredAt: "asc" },
      })
      return records.map(mapEvent)
    },
    async listBadCases(filters = {}) {
      const records = await client.simulationBadCase.findMany({
        where: {
          ...(filters.runId ? { runId: filters.runId } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.severity ? { severity: filters.severity } : {}),
          ...(filters.policyVersion
            ? { policyVersion: filters.policyVersion }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      })
      return records.map(mapBadCase)
    },
    async updateBadCase(id, patch) {
      return mapBadCase(
        await client.simulationBadCase.update({
          where: { id },
          data: {
            rootCause: patch.rootCause,
            improvementAction: patch.improvementAction,
          },
        }),
      )
    },
  }
}

interface CreateSimulationRepositoryOptions {
  prismaRepository?: SimulationRepository
  prismaProbe?: () => Promise<void>
  fileDirectory?: string
}

export async function createSimulationRepository(
  options: CreateSimulationRepositoryOptions = {},
): Promise<SimulationRepository> {
  const prismaRepository =
    options.prismaRepository ?? createPrismaSimulationRepository()
  const prismaProbe =
    options.prismaProbe ??
    (async () => {
      await prisma.simulationWorld.findFirst({ select: { id: true } })
    })

  try {
    await prismaProbe()
    return prismaRepository
  } catch (databaseError) {
    const databaseReason = `Prisma unavailable: ${
      databaseError instanceof Error
        ? databaseError.message
        : String(databaseError)
    }`
    try {
      return await createFileSimulationRepository(
        options.fileDirectory ?? defaultSimulationStoreDirectory(),
        databaseReason,
      )
    } catch (fileError) {
      const fileReason =
        fileError instanceof Error ? fileError.message : String(fileError)
      return createMemorySimulationRepository(
        emptyState(),
        `${databaseReason}; JSON unavailable: ${fileReason}`,
      )
    }
  }
}
