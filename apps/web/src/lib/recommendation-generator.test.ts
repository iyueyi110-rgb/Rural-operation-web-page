import assert from "node:assert/strict"
import test from "node:test"

import {
  getRecommendationReviewStatus,
  isAllowedRecommendationEndpoint,
  isValidRecommendationDate,
  normalizeRecommendationPayload,
  scheduleRecommendationGeneration,
  shouldSkipRecommendationGeneration,
} from "./recommendation-generator"

test("normalizes an Evidence, Action and Impact recommendation payload", () => {
  const payload = normalizeRecommendationPayload({
    type: "crowd_diversion",
    target_object: "ancient-road",
    evidence_metrics: { peakPeopleCount: 86, safetyRisk: 78 },
    message: "古道节点午后客流集中，建议分流。",
    action_steps: [
      {
        action: "创建分流巡查任务",
        api_trigger_endpoint: "/api/v1/tasks",
        method: "POST",
        payload: { title: "古道分流巡查" },
      },
    ],
    owner_role: "operator",
    expected_impact: "高峰拥挤度预计下降 20%。",
    confidence: 0.82,
  })

  assert.equal(payload.type, "crowd_diversion")
  assert.equal(payload.targetObject, "ancient-road")
  assert.deepEqual(payload.evidenceJson, {
    peakPeopleCount: 86,
    safetyRisk: 78,
  })
  assert.equal(payload.actionSteps.length, 1)
  assert.equal(payload.expectedImpact, "高峰拥挤度预计下降 20%。")
  assert.equal(payload.confidence, 0.82)
})

test("rejects recommendation payloads missing any part of Evidence, Action and Impact", () => {
  assert.throws(
    () =>
      normalizeRecommendationPayload({
        type: "maintenance",
        evidence_metrics: {},
        message: "巡检设备。",
        action_steps: [],
        expected_impact: "恢复上报。",
        confidence: 0.6,
      }),
    /required fields/i,
  )
})

test("allows only exact internal action endpoints", () => {
  for (const endpoint of [
    "/api/v1/scenes/promotion/active",
    "/api/v1/tasks",
    "/api/v1/notifications",
    "/api/v1/alerts",
  ]) {
    assert.equal(isAllowedRecommendationEndpoint(endpoint), true)
  }

  assert.equal(
    isAllowedRecommendationEndpoint("https://example.com/api/v1/tasks"),
    false,
  )
  assert.equal(isAllowedRecommendationEndpoint("/api/v1/tasks/extra"), false)
  assert.equal(
    isAllowedRecommendationEndpoint("//example.com/api/v1/tasks"),
    false,
  )
})

test("deduplicates same-day draft and approved cards", () => {
  assert.equal(shouldSkipRecommendationGeneration("draft"), true)
  assert.equal(shouldSkipRecommendationGeneration("approved"), true)
  assert.equal(shouldSkipRecommendationGeneration("rejected"), false)
  assert.equal(shouldSkipRecommendationGeneration("executed"), false)
  assert.equal(shouldSkipRecommendationGeneration(undefined), false)
})

test("allows review only from draft", () => {
  assert.equal(getRecommendationReviewStatus("draft", "approve"), "approved")
  assert.equal(getRecommendationReviewStatus("draft", "reject"), "rejected")
  assert.equal(getRecommendationReviewStatus("approved", "reject"), null)
  assert.equal(getRecommendationReviewStatus("rejected", "approve"), null)
})

test("accepts only real calendar dates", () => {
  assert.equal(isValidRecommendationDate("2026-06-21"), true)
  assert.equal(isValidRecommendationDate("2026-02-30"), false)
  assert.equal(isValidRecommendationDate("2026-6-21"), false)
})

test("schedules report recommendations without surfacing AI failures", async () => {
  let captured: unknown
  const result = scheduleRecommendationGeneration(
    "2026-06-21",
    async () => {
      throw new Error("AI unavailable")
    },
    (error) => {
      captured = error
    },
  )

  assert.equal(result, undefined)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.match(
    captured instanceof Error ? captured.message : "",
    /AI unavailable/,
  )
})
