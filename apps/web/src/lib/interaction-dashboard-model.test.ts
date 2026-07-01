import assert from "node:assert/strict"
import test from "node:test"

import {
  buildInteractionTaskGroups,
  summarizeInteractionProgress,
} from "./interaction-dashboard-model"

const baseTask = {
  id: "task",
  adoptionId: "adoption-1",
  treeId: "tree-1",
  title: "task",
  status: "pending",
  points: 0,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
}

test("groups legacy weekly watering rows into one monthly progress task", () => {
  const groups = buildInteractionTaskGroups([
    {
      ...baseTask,
      id: "w1",
      taskType: "watering",
      title: "第 1 周浇水",
      status: "completed",
      points: 10,
    },
    {
      ...baseTask,
      id: "w2",
      taskType: "watering",
      title: "第 2 周浇水",
      status: "completed",
      points: 10,
    },
    { ...baseTask, id: "w3", taskType: "watering", title: "第 3 周浇水" },
    { ...baseTask, id: "w4", taskType: "watering", title: "第 4 周浇水" },
    { ...baseTask, id: "d1", taskType: "diary", title: "记录养护日记" },
  ])

  assert.equal(groups.length, 2)
  assert.equal(groups[0].taskType, "watering")
  assert.equal(groups[0].maxCompletions, 4)
  assert.equal(groups[0].completionCount, 2)
  assert.equal(groups[0].status, "pending")
  assert.equal(groups[0].pointsPerCompletion, 10)
  assert.equal(groups[0].totalPointsEarned, 20)
})

test("summarizes mixed repeat-task and single-task progress by completion count", () => {
  const groups = buildInteractionTaskGroups([
    {
      ...baseTask,
      id: "watering-month",
      taskType: "watering",
      title: "本月浇水",
      maxCompletions: 4,
      completionCount: 3,
      pointsPerCompletion: 10,
      totalPointsEarned: 30,
    },
    {
      ...baseTask,
      id: "photo",
      taskType: "photo_upload",
      title: "上传成长照片",
      status: "completed",
      points: 15,
    },
  ])
  const summary = summarizeInteractionProgress(groups)

  assert.equal(summary.totalCompletions, 5)
  assert.equal(summary.completedCompletions, 4)
  assert.equal(summary.pendingCompletions, 1)
  assert.equal(summary.totalPointsEarned, 45)
  assert.equal(summary.completionRate, 80)
})
