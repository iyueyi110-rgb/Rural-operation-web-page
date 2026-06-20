import assert from "node:assert/strict"
import test from "node:test"

import { collectActiveAdopterPhones, shouldCreateReportNotification } from "./notification-hooks"

test("notifies only when a daily report is newly created", () => {
  assert.equal(shouldCreateReportNotification(null), true)
  assert.equal(shouldCreateReportNotification({ id: "existing" }), false)
})

test("deduplicates active adopter phones and removes empty values", () => {
  assert.deepEqual(
    collectActiveAdopterPhones([
      { adopterPhone: "139****0000" },
      { adopterPhone: null },
      { adopterPhone: "" },
      { adopterPhone: "139****0000" },
      { adopterPhone: "138****1111" },
    ]),
    ["139****0000", "138****1111"],
  )
})
