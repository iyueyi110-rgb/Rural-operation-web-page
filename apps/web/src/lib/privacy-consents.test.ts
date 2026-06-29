import assert from "node:assert/strict"
import test from "node:test"

import { CONSENT_TYPES, normalizeConsentType } from "./privacy-consents"

test("accepts only the four documented consent types", () => {
  assert.deepEqual(CONSENT_TYPES, [
    "privacy_policy",
    "data_collection",
    "ai_processing",
    "location",
  ])
  assert.equal(normalizeConsentType(" ai_processing "), "ai_processing")
  assert.equal(normalizeConsentType("marketing"), null)
})
