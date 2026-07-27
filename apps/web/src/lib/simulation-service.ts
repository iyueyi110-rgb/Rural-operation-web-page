import type {
  PolicyVersion,
  SimulationComparison,
  SimulationConfig,
  SimulationExportArtifactName,
  SimulationExportArtifacts,
  SimulationRun,
  SimulationRunPair,
  SimulationValidationResult,
  SimulationWorld,
} from "@zouma/contracts"

import type {
  JsonValue,
  SimulationBadCaseRecord,
  SimulationEventRecord,
  SimulationRepository,
  SimulationRunDetail,
  SimulationRunRecord,
  SimulationWorldRecord,
} from "./simulation-repository"

export interface SimulationEngineAdapter {
  validateSimulationConfig(
    config: Partial<SimulationConfig>,
  ): SimulationValidationResult
  generateSimulationWorld(config: Partial<SimulationConfig>): SimulationWorld
  runSimulation(
    world: SimulationWorld,
    policyVersion: PolicyVersion,
    options: {
      simulationRunId: string
      pairId?: string
      policyRevision?: string
    },
  ): SimulationRun
  compareSimulationRuns(
    v0: SimulationRun,
    v1: SimulationRun,
  ): SimulationComparison
  exportSimulationArtifacts(
    pair: SimulationRunPair,
    comparison: SimulationComparison,
  ): SimulationExportArtifacts
}

export class SimulationInputError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 422 = 400,
  ) {
    super(message)
    this.name = "SimulationInputError"
  }
}

interface SimulationServiceDependencies {
  repository: SimulationRepository
  engine: SimulationEngineAdapter
  now?: () => string
  id?: (prefix: string) => string
}

export interface CreateSimulationRunsInput {
  config: Partial<SimulationConfig>
  policyVersions?: PolicyVersion[]
  runName?: string
  policyRevision?: string
}

interface CreateSimulationRunsResult {
  runs: SimulationRunDetail[]
  comparison: SimulationComparison | null
}

function defaultId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function jsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value
  }
  if (Array.isArray(value)) return value.map((item) => jsonValue(item))
  if (typeof value === "object") {
    const output: { [key: string]: JsonValue } = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) output[key] = jsonValue(item)
    }
    return output
  }
  throw new SimulationInputError(
    `Value cannot be persisted as JSON: ${typeof value}`,
    422,
  )
}

function isJsonObject(
  value: JsonValue | null,
): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function parseStoredRun(value: JsonValue | null): SimulationRun {
  if (
    !isJsonObject(value) ||
    typeof value.simulationRunId !== "string" ||
    (value.policyVersion !== "V0" && value.policyVersion !== "V1") ||
    typeof value.worldHash !== "string" ||
    typeof value.seed !== "number" ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.badCases)
  ) {
    throw new SimulationInputError("Stored simulation run is invalid", 422)
  }
  return value as unknown as SimulationRun
}

function parseStoredWorld(value: JsonValue): SimulationWorld {
  if (
    !isJsonObject(value) ||
    value.dataOrigin !== "simulation" ||
    typeof value.seed !== "number" ||
    typeof value.worldHash !== "string" ||
    !isJsonObject(value.config)
  ) {
    throw new SimulationInputError("Stored simulation world is invalid", 422)
  }
  return value as unknown as SimulationWorld
}

function overlayBadCaseReviews(
  run: SimulationRun,
  badCases: SimulationBadCaseRecord[],
): SimulationRun {
  const reviewsById = new Map(
    badCases
      .filter((badCase) => badCase.runId === run.simulationRunId)
      .map((badCase) => [badCase.id, badCase]),
  )
  return {
    ...run,
    badCases: run.badCases.map((badCase) => {
      const review = reviewsById.get(badCase.id)
      return review
        ? {
            ...badCase,
            rootCause: review.rootCause ?? undefined,
            improvementAction: review.improvementAction ?? undefined,
          }
        : badCase
    }),
  }
}

function normalizePolicies(
  policies: PolicyVersion[] | undefined,
): PolicyVersion[] {
  const requested = policies ?? ["V0", "V1"]
  if (requested.length < 1 || requested.length > 2) {
    throw new SimulationInputError(
      "policyVersions must contain one or two policies",
    )
  }
  if (requested.some((policy) => policy !== "V0" && policy !== "V1")) {
    throw new SimulationInputError("policyVersions only supports V0 and V1")
  }
  if (new Set(requested).size !== requested.length) {
    throw new SimulationInputError("policyVersions cannot contain duplicates")
  }
  return requested
}

function eventRecord(
  run: SimulationRun,
  event: SimulationRun["events"][number],
): SimulationEventRecord {
  return {
    id: event.id,
    runId: run.simulationRunId,
    scenarioId: event.scenarioId,
    randomSeed: event.randomSeed,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    adoptionId: event.adoptionId ?? null,
    taskId: event.taskId ?? null,
    entityType: event.entityType,
    entityId: event.entityId,
    actorId: event.actorId ?? null,
    actorType: event.actorType,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus ?? null,
    payload: jsonValue(event.payload),
    dataOrigin: "simulation",
    policyVersion: run.policyVersion,
    policyRevision: run.policyRevision,
    createdAt: event.occurredAt,
  }
}

function badCaseRecord(
  run: SimulationRun,
  badCase: SimulationRun["badCases"][number],
  createdAt: string,
): SimulationBadCaseRecord {
  return {
    id: badCase.id,
    runId: run.simulationRunId,
    category: badCase.category,
    severity: badCase.severity,
    title: badCase.title,
    description: badCase.description,
    taskId: badCase.taskId ?? null,
    adoptionId: badCase.adoptionId ?? null,
    eventIds: [...badCase.eventIds],
    rootCause: badCase.rootCause ?? null,
    improvementAction: badCase.improvementAction ?? null,
    dataOrigin: "simulation",
    policyVersion: run.policyVersion,
    policyRevision: run.policyRevision,
    createdAt,
    updatedAt: createdAt,
  }
}

export function createSimulationService(
  dependencies: SimulationServiceDependencies,
) {
  const { repository, engine } = dependencies
  const now = dependencies.now ?? (() => new Date().toISOString())
  const id = dependencies.id ?? defaultId

  async function persistCompletedRun(
    run: SimulationRun,
    decision: SimulationComparison["recommendation"] | null,
  ) {
    const completedAt = run.completedAt || now()
    await repository.finalizeRun(
      run.simulationRunId,
      run.events.map((event) => eventRecord(run, event)),
      run.badCases.map((badCase) => badCaseRecord(run, badCase, completedAt)),
      {
        result: jsonValue(run),
        metrics: jsonValue(run.metrics),
        decision,
        completedAt,
      },
    )
  }

  async function createRuns(
    input: CreateSimulationRunsInput,
  ): Promise<CreateSimulationRunsResult> {
    const validation = engine.validateSimulationConfig(input.config)
    if (!validation.valid)
      throw new SimulationInputError(validation.errors.join("; "))
    const policyVersions = normalizePolicies(input.policyVersions)
    const world = engine.generateSimulationWorld(input.config)
    const worldId = id("world")
    const pairId = policyVersions.length === 2 ? id("pair") : null
    const createdAt = now()
    const worldRecord: SimulationWorldRecord = {
      id: worldId,
      scenarioId: world.config.scenario,
      randomSeed: world.seed,
      config: jsonValue(world.config),
      payload: jsonValue(world),
      worldHash: world.worldHash,
      dataOrigin: "simulation",
      createdAt,
    }
    await repository.createWorld(worldRecord)

    const completedRuns: SimulationRun[] = []
    const createdRunIds: string[] = []
    const failUnfinished = async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      for (const runId of createdRunIds) {
        try {
          const record = await repository.getRun(runId)
          if (
            record &&
            record.status !== "completed" &&
            record.status !== "failed"
          ) {
            await repository.failRun(runId, message, now())
          }
        } catch (cleanupError) {
          console.error(
            `Failed to mark simulation run ${runId} as failed:`,
            cleanupError,
          )
        }
      }
    }

    let comparison: SimulationComparison | null = null
    try {
      for (const policyVersion of policyVersions) {
        const runId = id("run")
        const startedAt = now()
        const revision = input.policyRevision ?? `${policyVersion}.1`
        const pending: SimulationRunRecord = {
          id: runId,
          pairId,
          worldId,
          runName:
            input.runName ?? `模拟 ${world.config.scenario} ${policyVersion}`,
          policyVersion,
          policyRevision: revision,
          status: "running",
          result: null,
          metrics: null,
          decision: null,
          errorMessage: null,
          startedAt,
          completedAt: null,
          archivedAt: null,
          dataOrigin: "simulation",
          createdAt: startedAt,
          updatedAt: startedAt,
        }
        await repository.createRun(pending)
        createdRunIds.push(runId)
        try {
          completedRuns.push(
            engine.runSimulation(world, policyVersion, {
              simulationRunId: runId,
              ...(pairId ? { pairId } : {}),
              policyRevision: revision,
            }),
          )
        } catch (error) {
          for (const completedRun of completedRuns) {
            await persistCompletedRun(completedRun, null)
          }
          throw error
        }
      }

      const v0 = completedRuns.find((run) => run.policyVersion === "V0")
      const v1 = completedRuns.find((run) => run.policyVersion === "V1")
      if (v0 && v1) comparison = engine.compareSimulationRuns(v0, v1)

      for (const run of completedRuns) {
        await persistCompletedRun(run, comparison?.recommendation ?? null)
      }
    } catch (error) {
      await failUnfinished(error)
      throw error
    }

    const details = await Promise.all(
      completedRuns.map(async (run) => {
        const detail = await repository.getRunDetail(run.simulationRunId)
        if (!detail)
          throw new Error(
            `Persisted simulation run ${run.simulationRunId} not found`,
          )
        return detail
      }),
    )
    return { runs: details, comparison }
  }

  async function compareRuns(v0RunId: string, v1RunId: string) {
    const [v0Detail, v1Detail] = await Promise.all([
      repository.getRunDetail(v0RunId),
      repository.getRunDetail(v1RunId),
    ])
    if (!v0Detail || !v1Detail)
      throw new SimulationInputError("Simulation run not found", 404)
    const v0 = parseStoredRun(v0Detail.run.result)
    const v1 = parseStoredRun(v1Detail.run.result)
    if (v0.policyVersion !== "V0" || v1.policyVersion !== "V1") {
      throw new SimulationInputError(
        "Comparison requires a V0 run and a V1 run",
        422,
      )
    }
    try {
      return engine.compareSimulationRuns(v0, v1)
    } catch (error) {
      throw new SimulationInputError(
        error instanceof Error
          ? error.message
          : "Simulation runs cannot be compared",
        422,
      )
    }
  }

  async function cloneRun(runId: string) {
    const detail = await repository.getRunDetail(runId)
    if (!detail) throw new SimulationInputError("Simulation run not found", 404)
    const world = parseStoredWorld(detail.world.payload)
    const cloned = await createRuns({
      config: world.config,
      policyVersions: [detail.run.policyVersion],
      runName: `${detail.run.runName}（复制）`,
      policyRevision: detail.run.policyRevision,
    })
    return cloned.runs[0]!
  }

  async function exportArtifact(
    v0RunId: string,
    v1RunId: string,
    artifact: SimulationExportArtifactName,
  ) {
    const [v0Detail, v1Detail] = await Promise.all([
      repository.getRunDetail(v0RunId),
      repository.getRunDetail(v1RunId),
    ])
    if (!v0Detail || !v1Detail)
      throw new SimulationInputError("Simulation run not found", 404)
    const v0 = overlayBadCaseReviews(
      parseStoredRun(v0Detail.run.result),
      v0Detail.badCases,
    )
    const v1 = overlayBadCaseReviews(
      parseStoredRun(v1Detail.run.result),
      v1Detail.badCases,
    )
    const comparison = await compareRuns(v0RunId, v1RunId)
    const pair: SimulationRunPair = {
      pairId: v0Detail.run.pairId ?? v1Detail.run.pairId ?? id("pair"),
      world: parseStoredWorld(v0Detail.world.payload),
      v0,
      v1,
    }
    const content = engine.exportSimulationArtifacts(pair, comparison)[artifact]
    if (
      artifact === "simulation_report.md" &&
      !content.includes("模拟运营数据，不代表真实业务结果")
    ) {
      return `# Demo 阶段规则模拟报告\n\n> 模拟运营数据，不代表真实业务结果。\n\n${content}`
    }
    return content
  }

  return { repository, createRuns, compareRuns, cloneRun, exportArtifact }
}
