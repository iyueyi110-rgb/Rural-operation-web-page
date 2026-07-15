import type {
  SimulationComparison,
  SimulationExportArtifacts,
  SimulationRun,
  SimulationRunPair,
} from "@zouma/contracts"

function csvCell(value: unknown): string {
  const text =
    value === undefined || value === null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function csv(headers: string[], rows: object[]): string {
  return [
    headers.join(","),
    ...rows.map((row) => {
      const values = row as unknown as Record<string, unknown>
      return headers.map((header) => csvCell(values[header])).join(",")
    }),
  ].join("\n")
}

function runRows(pair: SimulationRunPair): SimulationRun[] {
  return [pair.v0, pair.v1]
}

export function exportSimulationArtifacts(
  pair: SimulationRunPair,
  comparison: SimulationComparison,
): SimulationExportArtifacts {
  if (
    comparison.v0RunId !== pair.v0.simulationRunId ||
    comparison.v1RunId !== pair.v1.simulationRunId
  ) {
    throw new Error("Comparison does not belong to the supplied run pair")
  }
  const sameConfig =
    JSON.stringify(pair.world.config) === JSON.stringify(pair.v0.config) &&
    JSON.stringify(pair.world.config) === JSON.stringify(pair.v1.config)
  if (
    pair.world.worldHash !== pair.v0.worldHash ||
    pair.world.worldHash !== pair.v1.worldHash ||
    comparison.worldHash !== pair.world.worldHash ||
    pair.world.seed !== pair.v0.seed ||
    pair.world.seed !== pair.v1.seed ||
    comparison.seed !== pair.world.seed ||
    pair.world.config.scenario !== pair.v0.scenario ||
    pair.world.config.scenario !== pair.v1.scenario ||
    comparison.scenario !== pair.world.config.scenario ||
    pair.v0.policyVersion !== "V0" ||
    pair.v1.policyVersion !== "V1" ||
    !sameConfig ||
    comparison.v0PolicyRevision !== pair.v0.policyRevision ||
    comparison.v1PolicyRevision !== pair.v1.policyRevision
  ) {
    throw new Error("Simulation export world/run/comparison mismatch")
  }
  const runs = runRows(pair)
  const events = runs.flatMap((run) => run.events)
  const tasks = runs.flatMap((run) => run.tasks)
  const assignments = runs.flatMap((run) => run.assignments)
  const submissions = runs.flatMap((run) => run.submissions)
  const reviews = runs.flatMap((run) => run.reviews)
  const badCases = runs.flatMap((run) => run.badCases)
  const report = [
    "# Demo V0/V1 规则模拟报告",
    "",
    "本报告基于固定随机种子的规则模拟生成。",
    "项目当前处于Demo与业务验证设计阶段。",
    "报告中的接单率、按时提交率、审核通过率和权益履约率均为模拟指标，",
    "不代表真实用户、真实村民或实际运营结果。",
    "",
    "模拟运营数据，不代表真实业务结果。",
    "",
    "- 数据来源：simulation",
    `- V0运行：${pair.v0.simulationRunId}（${pair.v0.policyRevision}）`,
    `- V1运行：${pair.v1.simulationRunId}（${pair.v1.policyRevision}）`,
    `- 对比批次：${comparison.id}`,
    `- 场景：${comparison.scenario}`,
    `- 固定随机种子：${comparison.seed}`,
    `- 基础世界哈希：${comparison.worldHash}`,
    `- 模拟建议：${comparison.recommendation}`,
    "",
    "## 指标对比",
    "",
    "| 指标 | V0 | V1 | 差值 |",
    "| --- | ---: | ---: | ---: |",
    ...Object.values(comparison.metrics).map(
      (item) =>
        `| ${item.key} | ${item.v0 ?? "—"} | ${item.v1 ?? "—"} | ${item.absoluteDifference ?? "—"} |`,
    ),
  ].join("\n")

  return {
    "simulation_config.json": JSON.stringify(
      {
        dataOrigin: "simulation",
        createdAt: pair.v0.completedAt,
        simulationRunId: [pair.v0.simulationRunId, pair.v1.simulationRunId],
        simulationRunIds: [pair.v0.simulationRunId, pair.v1.simulationRunId],
        policyVersions: ["V0", "V1"],
        policyRevisions: {
          V0: pair.v0.policyRevision,
          V1: pair.v1.policyRevision,
        },
        scenarioId: pair.world.config.scenario,
        randomSeed: pair.world.seed,
        config: pair.world.config,
        worldHash: pair.world.worldHash,
      },
      null,
      2,
    ),
    "simulation_runs.csv": csv(
      [
        "simulationRunId",
        "scenarioId",
        "policyVersion",
        "policyRevision",
        "randomSeed",
        "dataOrigin",
        "createdAt",
        "status",
        "worldHash",
        "config",
      ],
      runs.map((run) => ({
        simulationRunId: run.simulationRunId,
        scenarioId: run.scenario,
        policyVersion: run.policyVersion,
        policyRevision: run.policyRevision,
        randomSeed: run.seed,
        dataOrigin: run.dataOrigin,
        createdAt: run.completedAt,
        status: run.status,
        worldHash: run.worldHash,
        config: run.config,
      })),
    ),
    "simulation_events.csv": csv(
      [
        "id",
        "simulationRunId",
        "scenarioId",
        "policyVersion",
        "policyRevision",
        "randomSeed",
        "dataOrigin",
        "eventType",
        "entityType",
        "entityId",
        "adoptionId",
        "taskId",
        "fromStatus",
        "toStatus",
        "actorType",
        "actorId",
        "occurredAt",
        "payload",
      ],
      events,
    ),
    "simulation_tasks.csv": csv(
      [
        "id",
        "simulationRunId",
        "policyVersion",
        "policyRevision",
        "dataOrigin",
        "adoptionId",
        "treeId",
        "taskType",
        "status",
        "assignedVillagerId",
        "assignmentAttempts",
        "createdAt",
        "dueAt",
        "effectiveDueAt",
        "submittedAt",
        "completedAt",
      ],
      tasks,
    ),
    "simulation_assignments.csv": csv(
      [
        "id",
        "simulationRunId",
        "policyVersion",
        "policyRevision",
        "dataOrigin",
        "taskId",
        "villagerId",
        "attempt",
        "status",
        "assignedAt",
        "respondedAt",
        "responseDeadlineAt",
        "score",
      ],
      assignments,
    ),
    "simulation_submissions.csv": csv(
      [
        "id",
        "simulationRunId",
        "policyVersion",
        "policyRevision",
        "dataOrigin",
        "taskId",
        "villagerId",
        "attempt",
        "submittedAt",
        "structured",
        "precheckPassed",
        "quality",
      ],
      submissions,
    ),
    "simulation_reviews.csv": csv(
      [
        "id",
        "simulationRunId",
        "policyVersion",
        "policyRevision",
        "dataOrigin",
        "taskId",
        "submissionId",
        "reviewerId",
        "attempt",
        "status",
        "startedAt",
        "completedAt",
        "reasons",
      ],
      reviews,
    ),
    "simulation_bad_cases.csv": csv(
      [
        "id",
        "simulationRunId",
        "policyVersion",
        "policyRevision",
        "dataOrigin",
        "category",
        "severity",
        "adoptionId",
        "taskId",
        "title",
        "description",
        "eventIds",
        "rootCause",
        "improvementAction",
      ],
      badCases,
    ),
    "simulation_metrics.json": JSON.stringify(
      runs.map((run) => ({
        simulationRunId: run.simulationRunId,
        scenarioId: run.scenario,
        policyVersion: run.policyVersion,
        randomSeed: run.seed,
        dataOrigin: run.dataOrigin,
        createdAt: run.completedAt,
        metrics: run.metrics,
      })),
      null,
      2,
    ),
    "simulation_comparison.json": JSON.stringify(comparison, null, 2),
    "simulation_report.md": report,
  }
}
