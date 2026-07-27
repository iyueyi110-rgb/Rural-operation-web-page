import assert from "node:assert/strict"
import test from "node:test"

import { CausalEventQueue, VirtualEventQueue } from "./event-queue.ts"

test("virtual queue orders by time, policy priority, then insertion sequence and stops at observation end", () => {
  const queue = new VirtualEventQueue<string>()
  queue.schedule("2026-07-13T02:00:00.000Z", 0, "late")
  queue.schedule("2026-07-13T01:00:00.000Z", 1, "normal")
  queue.schedule("2026-07-13T01:00:00.000Z", 3, "priority-first")
  queue.schedule("2026-07-14T01:00:00.000Z", 9, "outside")
  assert.deepEqual(queue.drainUntil("2026-07-14T00:00:00.000Z"), [
    "priority-first",
    "normal",
    "late",
  ])
  assert.equal(queue.size, 1)
})

test("causal queue executes callbacks at popped time and consumes children scheduled by callbacks", () => {
  const queue = new CausalEventQueue()
  const observed: string[] = []
  queue.schedule("2026-07-13T01:00:00.000Z", 0, ({ now, schedule }) => {
    observed.push(`parent:${now}`)
    schedule("2026-07-13T02:00:00.000Z", 0, ({ now: childNow }) =>
      observed.push(`child:${childNow}`),
    )
  })
  queue.schedule("2026-07-15T00:00:00.000Z", 0, () => observed.push("future"))
  queue.runUntil("2026-07-14T00:00:00.000Z")
  assert.deepEqual(observed, [
    "parent:2026-07-13T01:00:00.000Z",
    "child:2026-07-13T02:00:00.000Z",
  ])
  assert.equal(queue.size, 1)
})
