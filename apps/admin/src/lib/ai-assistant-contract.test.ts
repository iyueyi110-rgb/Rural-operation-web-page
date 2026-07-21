import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assistantPageSource = readFileSync(
  new URL("../app/(ai-system)/ai-assistant/page.tsx", import.meta.url),
  "utf8",
)

test("accepts direct knowledge responses and legacy data envelopes", () => {
  assert.match(assistantPageSource, /payload\.data \?\?/)
  assert.match(
    assistantPageSource,
    /typeof payload\.answer === "string" \? payload : undefined/,
  )
  assert.match(assistantPageSource, /answer: answer\.answer/)
})
