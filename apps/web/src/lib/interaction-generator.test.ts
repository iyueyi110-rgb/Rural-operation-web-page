import assert from "node:assert/strict"
import test from "node:test"

import { buildInteractionTaskDrafts } from "./interaction-generator"

test("builds four weekly watering tasks plus monthly care tasks", () => {
  const tasks = buildInteractionTaskDrafts("秋季")

  assert.equal(tasks.length, 7)
  assert.equal(tasks.filter((task) => task.taskType === "watering").length, 4)
  assert.equal(tasks.filter((task) => task.taskType === "fertilizing").length, 1)
  assert.equal(tasks.filter((task) => task.taskType === "photo_upload").length, 1)
  assert.equal(tasks.filter((task) => task.taskType === "diary").length, 1)
  assert.ok(tasks.every((task) => task.description.includes("秋季")))
})
