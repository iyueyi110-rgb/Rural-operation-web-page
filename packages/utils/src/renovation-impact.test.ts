import assert from "node:assert/strict"
import test from "node:test"

import packageJson from "../package.json" with { type: "json" }
import { computeRenovationImpact } from "./renovation-impact"

test("computes significantly improved impact when most indicators improve", () => {
  const report = computeRenovationImpact({
    before: {
      avgDailyVisitors: 100,
      avgDwellMin: 20,
      avgSatisfaction: 3,
      safetyRiskScore: 60,
      energyScore: 2,
      conversionRate: 0.05,
      spatialFeedbackCount: 10,
    },
    after: {
      avgDailyVisitors: 140,
      avgDwellMin: 30,
      avgSatisfaction: 4,
      safetyRiskScore: 30,
      energyScore: 4,
      conversionRate: 0.08,
      spatialFeedbackCount: 4,
    },
  })

  assert.equal(report.visitorChange, 40)
  assert.equal(report.safetyRiskChange, -50)
  assert.equal(report.feedbackReduction, -60)
  assert.equal(report.verdict, "significantly_improved")
  assert.match(report.summary, /7\/7/)
})

test("handles zero baselines and null conversion rates", () => {
  const report = computeRenovationImpact({
    before: {
      avgDailyVisitors: 0,
      avgDwellMin: 0,
      avgSatisfaction: 3,
      safetyRiskScore: 10,
      energyScore: 2,
      conversionRate: null,
      spatialFeedbackCount: 0,
    },
    after: {
      avgDailyVisitors: 12,
      avgDwellMin: 0,
      avgSatisfaction: 3,
      safetyRiskScore: 10,
      energyScore: 2,
      conversionRate: null,
      spatialFeedbackCount: 0,
    },
  })

  assert.equal(report.visitorChange, 100)
  assert.equal(report.dwellChange, 0)
  assert.equal(report.conversionRateChange, 0)
  assert.equal(report.feedbackReduction, 0)
})

test("declares the renovation impact package subpath export", () => {
  assert.equal(packageJson.exports["./renovation-impact"], "./src/renovation-impact.ts")
})
