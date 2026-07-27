import assert from "node:assert/strict"
import test from "node:test"

import { historySections } from "./history-data"

test("history narrative keeps the reviewed four-part evidence chain in order", () => {
  assert.deepEqual(
    historySections.map((section) => section.id),
    ["tang", "lychee", "milestone", "modern"],
  )

  for (const section of historySections) {
    assert.equal(section.reviewed, true)
    assert.equal(section.locationScope, "changshou-fengcheng-zouma-village")
    assert.match(section.titleKey, /^history\.sections\.[^.]+\.title$/)
    assert.match(section.bodyKey, /^history\.sections\.[^.]+\.body$/)
    assert.match(section.sourceKey, /^history\.sections\.[^.]+\.source$/)
    assert.match(section.audioLabelKey, /^history\.audio\./)
  }
})

test("history data never conflates Zouma Village with Jiulongpo Zouma Ancient Town", () => {
  const serialized = JSON.stringify(historySections)

  assert.doesNotMatch(serialized, /jiulongpo|ancient-town/i)
})
