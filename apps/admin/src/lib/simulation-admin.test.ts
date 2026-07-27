import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildSimulationFilters,
  defaultSimulationConfig,
  filterSimulationRecommendations,
  formatMetricDelta,
  normalizeSimulationList,
  scenarioOptions,
} from "./simulation-admin"

describe("simulation admin defaults", () => {
  it("uses the approved repeatable paired-run configuration", () => {
    assert.deepEqual(defaultSimulationConfig, {
      seed: 20260713,
      durationDays: 30,
      adoptionCount: 100,
      treeCount: 100,
      villagerCount: 20,
      reviewerCount: 3,
      minTasksPerAdoption: 3,
      maxTasksPerAdoption: 5,
      scenarioId: "NORMAL",
      policyVersions: ["V0", "V1"],
      weatherEnabled: true,
      anomaliesEnabled: true,
    })
  })

  it("offers all eight scenarios", () => {
    assert.deepEqual(
      scenarioOptions.map((item) => item.value),
      [
        "NORMAL",
        "ADOPTION_PEAK",
        "STAFF_SHORTAGE",
        "CONTINUOUS_RAIN",
        "LOW_SUBMISSION_QUALITY",
        "REMOTE_ZONE_LOAD",
        "REVIEW_BACKLOG",
        "HARVEST_PEAK",
      ],
    )
  })
})

describe("simulation admin API adapters", () => {
  it("omits blank filters and serializes time and policy fields", () => {
    assert.equal(
      buildSimulationFilters({
        runId: "run-1",
        adoptionId: "",
        taskId: "task-2",
        actorId: "worker-3",
        actorType: "villager",
        eventType: "TASK_SUBMITTED",
        policyVersion: "V1",
        startTime: "2026-07-01T00:00",
        endTime: "2026-07-31T23:59",
      }).toString(),
      "runId=run-1&taskId=task-2&actorId=worker-3&actorType=villager&eventType=TASK_SUBMITTED&policyVersion=V1&startTime=2026-07-01T00%3A00&endTime=2026-07-31T23%3A59",
    )
  })

  it("accepts both direct arrays and paginated data envelopes", () => {
    assert.deepEqual(normalizeSimulationList([{ id: "a" }]), [{ id: "a" }])
    assert.deepEqual(normalizeSimulationList({ data: [{ id: "b" }] }), [
      { id: "b" },
    ])
    assert.deepEqual(
      normalizeSimulationList({ data: { items: [{ id: "c" }] } }),
      [{ id: "c" }],
    )
    assert.deepEqual(normalizeSimulationList(null), [])
  })
})

describe("simulation recommendation boundary", () => {
  it("only keeps the four approved recommendation sentences", () => {
    assert.deepEqual(
      filterSimulationRecommendations([
        "模拟结果建议采用V1",
        "模型建议立刻全量上线",
        "存在场景退化，需要继续调整",
        "样本不足，暂不形成结论",
      ]),
      [
        "模拟结果建议采用V1",
        "存在场景退化，需要继续调整",
        "样本不足，暂不形成结论",
      ],
    )
  })
})

describe("simulation metric presentation", () => {
  it("uses percentage points for rate metrics", () => {
    assert.equal(
      formatMetricDelta(
        { value: 0.71, unit: "rate" },
        { value: 0.78, unit: "rate" },
      ),
      "+7.0 个百分点",
    )
  })

  it("uses a safe absolute delta when the baseline is zero", () => {
    assert.equal(
      formatMetricDelta(
        { value: 0, unit: "count" },
        { value: 4, unit: "count" },
      ),
      "+4（基线为 0）",
    )
  })

  it("renders unavailable values as an em dash", () => {
    assert.equal(
      formatMetricDelta(
        { value: null, unit: "rate" },
        { value: 0.2, unit: "rate" },
      ),
      "—",
    )
  })
})
