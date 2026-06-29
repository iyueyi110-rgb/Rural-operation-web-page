import assert from "node:assert/strict"
import test from "node:test"

import { resolvePaidOrderUpdate } from "./payment-status"

test("maps a paid demo payment to the matching business order status", () => {
  assert.deepEqual(resolvePaidOrderUpdate("tree_adoption"), {
    model: "treeAdoption",
    status: "active",
  })
  assert.deepEqual(resolvePaidOrderUpdate("ticket_order"), {
    model: "ticketOrder",
    status: "paid",
  })
  assert.deepEqual(resolvePaidOrderUpdate("courtyard_booking"), {
    model: "unifiedOrder",
    status: "paid",
  })
})

test("rejects unknown payment business order types", () => {
  assert.equal(resolvePaidOrderUpdate("unknown"), null)
})
