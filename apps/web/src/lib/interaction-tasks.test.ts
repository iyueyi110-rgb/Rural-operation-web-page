import assert from "node:assert/strict"
import test from "node:test"

import { getInteractionPoints, isInteractionTaskType } from "./interaction-tasks"

test("accepts only documented interaction task types", () => {
  assert.equal(isInteractionTaskType("watering"), true)
  assert.equal(isInteractionTaskType("fertilizing"), true)
  assert.equal(isInteractionTaskType("photo_upload"), true)
  assert.equal(isInteractionTaskType("diary"), true)
  assert.equal(isInteractionTaskType("share"), true)
  assert.equal(isInteractionTaskType("unknown"), false)
})

test("maps each interaction type to its completion points", () => {
  assert.equal(getInteractionPoints("watering"), 10)
  assert.equal(getInteractionPoints("fertilizing"), 10)
  assert.equal(getInteractionPoints("photo_upload"), 15)
  assert.equal(getInteractionPoints("diary"), 20)
  assert.equal(getInteractionPoints("share"), 15)
})
