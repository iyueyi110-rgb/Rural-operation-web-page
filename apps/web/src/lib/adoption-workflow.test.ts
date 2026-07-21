import assert from "node:assert/strict"
import test from "node:test"

import { nextAdoptionStatus } from "./adoption-workflow"
import { nextFulfillmentStatus } from "./fulfillment-workflow"

test("enforces the canonical adoption lifecycle", () => {
  assert.equal(nextAdoptionStatus("pending_payment", "activate"), "active")
  assert.equal(
    nextAdoptionStatus("active", "request_refund"),
    "refund_requested",
  )
  assert.equal(nextAdoptionStatus("pending_payment", "approve_refund"), null)
})

test("keeps adoption fulfillment transitions separate from legacy tasks", () => {
  assert.equal(nextFulfillmentStatus("pending", "accept"), "accepted")
  assert.equal(nextFulfillmentStatus("submitted", "reject"), "rejected")
  assert.equal(nextFulfillmentStatus("completed", "approve"), null)
})
