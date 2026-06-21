import assert from "node:assert/strict"
import test from "node:test"

import {
  buildEnvironmentMetrics,
  getRightsVisualState,
  growthStages,
  normalizeAdoptionRights,
  normalizeSensorStatus,
  shouldDisplaySensorValues,
} from "./tree-experience"

test("maps sensor states to active, warning and inactive displays", () => {
  assert.equal(normalizeSensorStatus("active"), "active")
  assert.equal(normalizeSensorStatus("warning"), "warning")
  assert.equal(normalizeSensorStatus("inactive"), "inactive")
  assert.equal(normalizeSensorStatus("unknown"), "warning")

  const live = buildEnvironmentMetrics(
    [
      { type: "soil_moisture", value: 63, unit: "%" },
      { type: "humidity", value: 74, unit: "%" },
      { type: "light", value: 42, unit: "klux" },
    ],
    "active",
  )
  assert.deepEqual(
    live.map((metric) => metric.value),
    [63, 74, 42],
  )
  assert.ok(live.every((metric) => !metric.isBaseline))

  const warning = buildEnvironmentMetrics([], "warning")
  assert.ok(warning.every((metric) => metric.isBaseline))
  assert.ok(
    buildEnvironmentMetrics([], "inactive").every(
      (metric) => metric.isBaseline,
    ),
  )
  assert.equal(shouldDisplaySensorValues("active", false), true)
  assert.equal(shouldDisplaySensorValues("warning", false), true)
  assert.equal(shouldDisplaySensorValues("inactive", false), false)
  assert.equal(shouldDisplaySensorValues("active", true), false)
})

test("normalizes rights and locks pending payment cards", () => {
  const rights = normalizeAdoptionRights(
    {
      harvestQuota: "12 kg",
      onsiteBooking: true,
      nameplate: true,
      coldChain: false,
    },
    "annual",
  )

  assert.deepEqual(rights, {
    harvestQuota: "12 kg",
    onsiteBooking: true,
    nameplate: true,
    coldChain: false,
  })
  assert.equal(getRightsVisualState("active"), "unlocked")
  assert.equal(getRightsVisualState("pending_payment"), "locked")
  assert.equal(getRightsVisualState("available"), "preview")
})

test("keeps the four growth stages in narrative order", () => {
  assert.deepEqual(growthStages, [
    "flowering",
    "fruiting",
    "ripening",
    "harvest",
  ])
})
