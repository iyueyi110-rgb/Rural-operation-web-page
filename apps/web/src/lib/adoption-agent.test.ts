import assert from "node:assert/strict"
import test from "node:test"

import {
  isAdoptionRecommendationType,
  normalizeAdoptionSuggestion,
  shouldExecuteRecommendationActions,
} from "./adoption-agent-schema"

test("normalizes a human-gated adoption suggestion", () => {
  const result = normalizeAdoptionSuggestion(
    {
      risk_level: "high",
      adoption_id: "ADOPT-1",
      task_id: "TASK-1",
      risk_type: "deadline",
      evidence_refs: ["task:TASK-1"],
      summary: "任务临近截止时间。",
      recommended_action: "remind",
      reason: "截止时间不足两天。",
      confidence: 0.9,
      requires_human_approval: true,
    },
    "RUN-1",
  )
  assert.equal(result.requiresHumanApproval, true)
  assert.equal(result.runId, "RUN-1")
})

test("identifies adoption recommendations for approval isolation", () => {
  assert.equal(isAdoptionRecommendationType("adoption_deadline_risk"), true)
  assert.equal(isAdoptionRecommendationType("weather_plan"), false)
  assert.equal(
    shouldExecuteRecommendationActions("adoption_deadline_risk"),
    false,
  )
  assert.equal(shouldExecuteRecommendationActions("weather_plan"), true)
})
