import assert from "node:assert/strict"
import test from "node:test"

import {
  buildSparklinePath,
  formatEvidenceEntries,
  summarizeProductFeedback,
  summarizeProduction,
  summarizeVisitorBehavior,
} from "./dashboard-data"

test("summarizes active villagers and completed work", () => {
  const summary = summarizeProduction(
    [{ status: "active" }, { status: "inactive" }, { status: "active" }],
    [{ earnings: 80 }, { earnings: 120 }, { earnings: 0 }],
  )

  assert.deepEqual(summary, {
    activeVillagers: 2,
    completedTasks: 3,
    completedEarnings: 200,
  })
})

test("combines consumption and presence into visitor behavior metrics", () => {
  const summary = summarizeVisitorBehavior(
    [
      { totalAmount: 360, orderCount: 4 },
      { totalAmount: 140, orderCount: 2 },
    ],
    [{ peopleCount: 3 }, { peopleCount: 9 }, { peopleCount: 6 }],
  )

  assert.deepEqual(summary, {
    currentVisitors: 6,
    peakVisitors: 9,
    orderCount: 6,
    revenue: 500,
  })
})

test("summarizes product availability and urgent feedback", () => {
  const summary = summarizeProductFeedback(
    [
      { rating: 5, severity: "low" },
      { rating: 3, severity: "urgent" },
    ],
    [{ stockStatus: "available" }, { stockStatus: "sold_out" }],
  )

  assert.deepEqual(summary, {
    averageRating: 4,
    urgentFeedback: 1,
    availableProducts: 1,
    productCount: 2,
  })
})

test("builds a finite sparkline and centers constant values", () => {
  assert.match(buildSparklinePath([2, 5, 3], 160, 36), /^M /)
  assert.equal(buildSparklinePath([7, 7], 100, 40), "M 0 20 L 100 20")
  assert.equal(buildSparklinePath([], 100, 40), "")
  assert.doesNotMatch(buildSparklinePath([2, 5, 3], 160, 36), /NaN|Infinity/)
})

test("formats evidence values without exposing object coercion noise", () => {
  assert.deepEqual(
    formatEvidenceEntries({ rainProbability: 0.8, nodes: ["荔枝园", "古道"] }),
    [
      { label: "rainProbability", value: "0.8" },
      { label: "nodes", value: "荔枝园、古道" },
    ],
  )
  assert.deepEqual(formatEvidenceEntries(null), [])
})
