import assert from "node:assert/strict"
import test from "node:test"

import { sendSms } from "./sms-provider"

test("falls back without invoking a transport when SMS is not configured", async () => {
  let called = false
  const sent = await sendSms("13900000000", "任务提醒", {
    apiKey: "",
    templateId: "",
    transport: async () => {
      called = true
      return true
    },
  })

  assert.equal(sent, false)
  assert.equal(called, false)
})

test("uses the reserved transport seam when SMS configuration is available", async () => {
  let received: unknown
  const sent = await sendSms("13900000000", "任务提醒", {
    apiKey: "test-key",
    templateId: "task-template",
    transport: async (message) => {
      received = message
      return true
    },
  })

  assert.equal(sent, true)
  assert.deepEqual(received, {
    phone: "13900000000",
    content: "任务提醒",
    apiKey: "test-key",
    templateId: "task-template",
  })
})

test("SMS transport failures return false so callers can preserve in-app delivery", async () => {
  const sent = await sendSms("13900000000", "任务提醒", {
    apiKey: "test-key",
    templateId: "task-template",
    transport: async () => {
      throw new Error("provider unavailable")
    },
  })

  assert.equal(sent, false)
})
