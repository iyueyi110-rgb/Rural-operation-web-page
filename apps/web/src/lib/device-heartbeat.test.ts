import assert from "node:assert/strict"
import test from "node:test"

import {
  OFFLINE_THRESHOLD_MS,
  buildDeviceOfflineAlertMessage,
  checkDeviceHeartbeatSafely,
  isDeviceHeartbeatExpired,
  resolveSensorHealthStatus,
} from "./device-heartbeat"

const now = new Date("2026-06-21T04:00:00.000Z")

test("marks only missing or older-than-90-minute heartbeats as expired", () => {
  assert.equal(OFFLINE_THRESHOLD_MS, 90 * 60 * 1000)
  assert.equal(isDeviceHeartbeatExpired(null, now), true)
  assert.equal(
    isDeviceHeartbeatExpired(new Date(now.getTime() - 91 * 60 * 1000), now),
    true,
  )
  assert.equal(
    isDeviceHeartbeatExpired(new Date(now.getTime() - 89 * 60 * 1000), now),
    false,
  )
})

test("resolves active, warning and maintenance sensor states", () => {
  const fresh = now.getTime() - 5 * 60 * 1000
  const stale = now.getTime() - 31 * 60 * 1000

  assert.equal(
    resolveSensorHealthStatus("active", fresh, now.getTime()),
    "active",
  )
  assert.equal(
    resolveSensorHealthStatus("active", stale, now.getTime()),
    "warning",
  )
  assert.equal(resolveSensorHealthStatus("active", 0, now.getTime()), "warning")
  assert.equal(
    resolveSensorHealthStatus("warning", fresh, now.getTime()),
    "warning",
  )
  assert.equal(
    resolveSensorHealthStatus("inactive", fresh, now.getTime()),
    "inactive",
  )
  assert.equal(
    resolveSensorHealthStatus("offline", fresh, now.getTime()),
    "inactive",
  )
})

test("offline alert message identifies the exact device", () => {
  assert.equal(
    buildDeviceOfflineAlertMessage({ name: "北坡墒情仪", deviceId: "soil-07" }),
    "北坡墒情仪 (soil-07) offline for >1.5 hours.",
  )
})

test("heartbeat failures degrade without blocking report generation", async () => {
  let captured: unknown
  const result = await checkDeviceHeartbeatSafely(
    async () => {
      throw new Error("database unavailable")
    },
    (error) => {
      captured = error
    },
  )

  assert.equal(result, null)
  assert.match(
    captured instanceof Error ? captured.message : "",
    /database unavailable/,
  )
})
