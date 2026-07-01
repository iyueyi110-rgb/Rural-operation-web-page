import assert from "node:assert/strict"
import test from "node:test"

import { buildInteractionTaskDrafts } from "./interaction-generator"

test("builds one repeat watering task plus monthly care and share tasks", () => {
  const tasks = buildInteractionTaskDrafts("秋季")

  assert.equal(tasks.length, 5)
  assert.deepEqual(
    tasks.find((task) => task.taskType === "watering"),
    {
      taskType: "watering",
      title: "本月浇水",
      description: "秋季养护任务：完成每周浇水并记录树木状态。",
      maxCompletions: 4,
    },
  )
  assert.equal(
    tasks.filter((task) => task.taskType === "fertilizing").length,
    1,
  )
  assert.equal(
    tasks.filter((task) => task.taskType === "photo_upload").length,
    1,
  )
  assert.equal(tasks.filter((task) => task.taskType === "diary").length, 1)
  assert.equal(tasks.filter((task) => task.taskType === "share").length, 1)
  assert.ok(tasks.every((task) => task.description.includes("秋季")))
})
