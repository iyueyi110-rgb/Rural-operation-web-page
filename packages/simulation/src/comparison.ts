import type {
  SimulationComparison,
  SimulationConfig,
  SimulationMetricComparison,
  SimulationMetricKey,
  SimulationRun,
  SimulationRunPair,
} from "@zouma/contracts"

import { deterministicId, stableStringify } from "./deterministic.ts"
import { generateSimulationWorld } from "./world.ts"
import { runSimulation } from "./run.ts"

export interface RunSimulationPairOptions {
  pairId?: string
  v0RunId?: string
  v1RunId?: string
  policyRevision?: { V0?: string; V1?: string }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function runSimulationPair(
  input: Partial<SimulationConfig> = {},
  options: RunSimulationPairOptions = {},
): SimulationRunPair {
  const world = generateSimulationWorld(input)
  const pairId =
    options.pairId ?? deterministicId("pair", [world.worldHash, "V0-V1"])
  const v0 = runSimulation(clone(world), "V0", {
    pairId,
    simulationRunId: options.v0RunId ?? `${pairId}_v0`,
    policyRevision: options.policyRevision?.V0,
  })
  const v1 = runSimulation(clone(world), "V1", {
    pairId,
    simulationRunId: options.v1RunId ?? `${pairId}_v1`,
    policyRevision: options.policyRevision?.V1,
  })
  return { pairId, world, v0, v1 }
}

const KEYS: SimulationMetricKey[] = [
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

function comparable(v0: SimulationRun, v1: SimulationRun): void {
  if (v0.policyVersion !== "V0" || v1.policyVersion !== "V1")
    throw new Error("Comparison requires a V0 run followed by a V1 run")
  if (v0.worldHash !== v1.worldHash)
    throw new Error(
      "Runs must use the same worldHash; results cannot be attributed to policy",
    )
  if (
    v0.seed !== v1.seed ||
    v0.scenario !== v1.scenario ||
    stableStringify(v0.config) !== stableStringify(v1.config)
  ) {
    throw new Error(
      "Runs must use the same world seed, scenario, and base configuration",
    )
  }
}

function meetsMinimum(
  value: number | null,
  baseline: number | null,
  improvement = 0,
): boolean {
  return value !== null && baseline !== null && value >= baseline + improvement
}

export function compareSimulationRuns(
  v0: SimulationRun,
  v1: SimulationRun,
): SimulationComparison {
  comparable(v0, v1)
  const metrics = {} as Record<SimulationMetricKey, SimulationMetricComparison>
  for (const key of KEYS) {
    const baseline = v0.metrics[key].value
    const optimized = v1.metrics[key].value
    const difference =
      baseline === null || optimized === null ? null : optimized - baseline
    metrics[key] = {
      key,
      v0: baseline,
      v1: optimized,
      absoluteDifference: difference,
      percentagePointDifference:
        v0.metrics[key].unit === "ratio" && difference !== null
          ? difference * 100
          : null,
      safeRelativeChange:
        difference === null || baseline === null || baseline === 0
          ? null
          : difference / Math.abs(baseline),
    }
  }

  const reasons: string[] = []
  const sampleDenominators = [
    v0.metrics.acceptance_rate.denominator,
    v1.metrics.acceptance_rate.denominator,
    v0.metrics.on_time_submission_rate.denominator,
    v1.metrics.on_time_submission_rate.denominator,
    v0.metrics.first_review_pass_rate.denominator,
    v1.metrics.first_review_pass_rate.denominator,
  ]
  let recommendation: SimulationComparison["recommendation"]
  if (Math.min(...sampleDenominators) < 30) {
    recommendation = "样本不足，暂不形成结论"
    reasons.push("主要指标的有效分母小于30")
  } else {
    const degradations = [
      ["模拟任务接单率", metrics.acceptance_rate.absoluteDifference],
      ["模拟按时提交率", metrics.on_time_submission_rate.absoluteDifference],
      ["模拟首次审核通过率", metrics.first_review_pass_rate.absoluteDifference],
      ["模拟最终审核通过率", metrics.final_review_pass_rate.absoluteDifference],
    ] as const
    const severe = degradations.filter(
      ([, difference]) => difference !== null && difference < -0.05,
    )
    const overdueDegradation =
      metrics.overdue_rate.absoluteDifference !== null &&
      metrics.overdue_rate.absoluteDifference > 0.05
    const onTimeDifferenceBasisPoints =
      metrics.on_time_submission_rate.absoluteDifference === null
        ? null
        : Math.round(
            metrics.on_time_submission_rate.absoluteDifference * 10_000,
          )
    const peakOnTimeDegradation =
      (v0.scenario === "ADOPTION_PEAK" || v0.scenario === "HARVEST_PEAK") &&
      onTimeDifferenceBasisPoints !== null &&
      onTimeDifferenceBasisPoints < -200
    if (severe.length > 0 || overdueDegradation || peakOnTimeDegradation) {
      recommendation = "存在场景退化，需要继续调整"
      reasons.push(...severe.map(([name]) => `${name}退化超过5个百分点`))
      if (overdueDegradation) reasons.push("模拟任务逾期率增加超过5个百分点")
      if (peakOnTimeDegradation)
        reasons.push("高峰场景模拟按时提交率退化超过2个百分点")
    } else {
      const manualV0 = v0.metrics.manual_intervention_count.value ?? 0
      const manualV1 = v1.metrics.manual_intervention_count.value ?? 0
      const manualWithinLimit =
        manualV0 === 0 ? manualV1 === 0 : manualV1 <= manualV0 * 1.1
      const passes =
        meetsMinimum(
          v1.metrics.acceptance_rate.value,
          v0.metrics.acceptance_rate.value,
        ) &&
        meetsMinimum(
          v1.metrics.on_time_submission_rate.value,
          v0.metrics.on_time_submission_rate.value,
          0.05,
        ) &&
        meetsMinimum(
          v1.metrics.first_review_pass_rate.value,
          v0.metrics.first_review_pass_rate.value,
          0.05,
        ) &&
        (v1.metrics.overdue_rate.value ?? 1) <=
          (v0.metrics.overdue_rate.value ?? 0) &&
        (v1.metrics.average_acceptance_hours.value ??
          Number.POSITIVE_INFINITY) <
          (v0.metrics.average_acceptance_hours.value ??
            Number.POSITIVE_INFINITY) &&
        manualWithinLimit &&
        (metrics.reassignment_rate.absoluteDifference ??
          Number.POSITIVE_INFINITY) <= 0.1 &&
        (metrics.assignment_fairness_cv.absoluteDifference ??
          Number.POSITIVE_INFINITY) <= 0.05
      recommendation = passes ? "模拟结果建议采用V1" : "模拟结果暂不支持升级"
      if (!passes) reasons.push("至少一项预置升级标准未满足")
      else reasons.push("全部预置升级标准均满足")
    }
  }
  return {
    id: deterministicId("comparison", [v0.simulationRunId, v1.simulationRunId]),
    dataOrigin: "simulation",
    v0RunId: v0.simulationRunId,
    v1RunId: v1.simulationRunId,
    v0PolicyRevision: v0.policyRevision,
    v1PolicyRevision: v1.policyRevision,
    policyVersions: ["V0", "V1"],
    worldHash: v0.worldHash,
    seed: v0.seed,
    scenario: v0.scenario,
    metrics,
    recommendation,
    reasons,
  }
}
