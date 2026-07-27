import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  badCaseCategoryLabel,
  buildBadCasePolicyComparison,
  buildEvidenceCheckSummary,
  buildRunBreakdowns,
  metricDeltaTone,
  normalizeRuns,
  resolveSelectedRun,
  type SimulationBadCase,
  type SimulationRun,
} from "../components/simulation/types"

const runBase = {
  id: "run-v0",
  simulationRunId: "run-v0",
  dataOrigin: "simulation",
  policyVersion: "V0",
  policyRevision: "V0.1",
  worldHash: "same-world",
  seed: 20260713,
  scenario: "NORMAL",
  status: "completed",
} as const

describe("simulation comparison breakdowns", () => {
  it("deterministically aggregates task type, zone, scenario, and executor load", () => {
    const v0 = {
      ...runBase,
      tasks: [
        {
          id: "a",
          taskType: "watering",
          zone: "near",
          assignedVillagerId: "villager-1",
        },
        {
          id: "b",
          taskType: "harvest",
          zone: "remote",
          assignedVillagerId: "villager-1",
        },
      ],
    } as SimulationRun
    const v1 = {
      ...runBase,
      id: "run-v1",
      simulationRunId: "run-v1",
      policyVersion: "V1",
      tasks: [
        {
          id: "a",
          taskType: "watering",
          zone: "near",
          assignedVillagerId: "villager-1",
        },
        {
          id: "b",
          taskType: "harvest",
          zone: "remote",
          assignedVillagerId: "villager-2",
        },
      ],
    } as SimulationRun

    const result = buildRunBreakdowns(v0, v1)
    assert.deepEqual(
      result.map((group) => group.key),
      ["taskType", "zone", "scenario", "executorLoad"],
    )
    assert.deepEqual(
      result[0]?.rows.map((row) => [row.key, row.taskCountV0, row.taskCountV1]),
      [
        ["harvest", 1, 1],
        ["watering", 1, 1],
      ],
    )
    assert.equal(result[2]?.label, "模拟当前场景效果")
    assert.match(result[2]?.source ?? "", /当前选择的单组场景/)
    assert.equal(result[3]?.source, "由已载入成对模拟运行结果确定性聚合")
  })

  it("computes core effects with auditable numerators and denominators", () => {
    const v0 = {
      ...runBase,
      tasks: [
        {
          id: "a",
          taskType: "watering",
          zone: "near",
          assignedVillagerId: "v1",
          acceptedAt: "2026-07-01T01:00:00Z",
          submittedAt: "2026-07-01T03:00:00Z",
          effectiveDueAt: "2026-07-01T04:00:00Z",
          firstReviewPassed: true,
          status: "completed",
        },
        {
          id: "b",
          taskType: "watering",
          zone: "near",
          assignedVillagerId: "v1",
          effectiveDueAt: "2026-07-01T04:00:00Z",
          status: "overdue",
        },
      ],
      assignments: [
        {
          id: "assignment-a-1",
          taskId: "a",
          villagerId: "v1",
          assignedAt: "2026-07-01T00:00:00Z",
          status: "accepted",
        },
        {
          id: "assignment-b-1",
          taskId: "b",
          villagerId: "v1",
          assignedAt: "2026-07-01T00:00:00Z",
          status: "rejected",
        },
        {
          id: "assignment-b-2",
          taskId: "b",
          villagerId: "v2",
          assignedAt: "2026-07-01T01:00:00Z",
          status: "expired",
        },
      ],
    } as SimulationRun
    const v1 = {
      ...v0,
      id: "run-v1",
      simulationRunId: "run-v1",
      policyVersion: "V1",
    } as SimulationRun
    const row = buildRunBreakdowns(v0, v1)[0]?.rows[0]
    assert.deepEqual(
      row?.effects.map((effect) => [
        effect.key,
        effect.v0.numerator,
        effect.v0.denominator,
        effect.v0.value,
      ]),
      [
        ["acceptance_rate", 1, 3, 1 / 3],
        ["on_time_submission_rate", 1, 1, 1],
        ["first_review_pass_rate", 1, 1, 1],
        ["overdue_rate", 0, 1, 0],
      ],
    )
  })
})

describe("simulation run selection", () => {
  it("parses the paginated Web summary envelope without a full result", () => {
    const runs = normalizeRuns({
      data: {
        items: [
          {
            id: "run-summary",
            policyVersion: "V1",
            worldHash: "hash-summary",
            config: { durationDays: 30, scenario: "NORMAL" },
            metrics: { acceptance_rate: { value: 0.82, unit: "rate" } },
          },
        ],
      },
      meta: { pagination: { page: 1, pageSize: 25, hasMore: false } },
    })

    assert.equal(runs[0]?.id, "run-summary")
    assert.equal(runs[0]?.worldHash, "hash-summary")
    assert.deepEqual(runs[0]?.config, {
      durationDays: 30,
      scenario: "NORMAL",
    })
    assert.equal("result" in runs[0]!, false)
  })

  it("keeps the current selection only when id and policy still match", () => {
    const current = { ...runBase } as SimulationRun
    assert.equal(
      resolveSelectedRun(current, [
        { ...current },
        { ...current, id: "next" } as SimulationRun,
      ])?.id,
      "run-v0",
    )
    assert.equal(
      resolveSelectedRun(current, [
        { ...current, policyVersion: "V1" } as SimulationRun,
        { ...current, id: "fallback" } as SimulationRun,
      ])?.id,
      "fallback",
    )
    assert.equal(resolveSelectedRun(current, []) ?? null, null)
  })
})

describe("simulation metric direction", () => {
  it("treats lower overdue and duration metrics as improvements", () => {
    assert.equal(metricDeltaTone("overdue_rate", 0.2, 0.1), "positive")
    assert.equal(metricDeltaTone("average_review_hours", 4, 6), "negative")
    assert.equal(metricDeltaTone("manual_intervention_count", 8, 8), "neutral")
  })

  it("treats higher positive rates as improvements", () => {
    assert.equal(metricDeltaTone("acceptance_rate", 0.7, 0.8), "positive")
    assert.equal(
      metricDeltaTone("first_review_pass_rate", 0.8, 0.7),
      "negative",
    )
  })
})

describe("simulation rule evidence checks", () => {
  it("counts passed, failed, and pending checks", () => {
    const run = {
      ...runBase,
      submissions: [
        { id: "s1", precheckPassed: true, taskId: "t1" },
        { id: "s2", precheckPassed: false, taskId: "t2" },
        { id: "s3", taskId: "t3" },
      ],
    } as SimulationRun
    assert.deepEqual(buildEvidenceCheckSummary(run), {
      passed: 1,
      failed: 1,
      pending: 1,
      items: run.submissions,
    })
  })
})

describe("simulation bad case comparison", () => {
  it("compares category counts by V0 and V1 with Chinese labels", () => {
    const badCases = [
      { id: "b1", category: "overdue", policyVersion: "V0" },
      { id: "b2", category: "overdue", policyVersion: "V0" },
      { id: "b3", category: "overdue", policyVersion: "V1" },
    ] as SimulationBadCase[]
    assert.deepEqual(buildBadCasePolicyComparison(badCases), [
      { category: "overdue", label: "任务逾期", v0: 2, v1: 1 },
    ])
    assert.equal(badCaseCategoryLabel("review_backlog"), "审核积压")
  })
})
