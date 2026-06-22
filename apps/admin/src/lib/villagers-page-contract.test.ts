import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const villagersPageSource = readFileSync(
  new URL("../app/villagers/page.tsx", import.meta.url),
  "utf8",
)

test("handles unavailable villager APIs without an unhandled rejection", () => {
  assert.match(villagersPageSource, /async function loadData\(\)[\s\S]*?try \{/)
  assert.match(villagersPageSource, /if \(!villagerResponse\.ok \|\| !nodeResponse\.ok\)/)
  assert.match(villagersPageSource, /catch \(caughtError\)/)
  assert.match(villagersPageSource, /finally \{[\s\S]*?setIsLoading\(false\)/)
})

test("handles connection failures while saving a villager", () => {
  assert.match(villagersPageSource, /async function saveVillager\(\)[\s\S]*?try \{/)
  assert.match(villagersPageSource, /catch \{[\s\S]*?adminCopy\.villagers\.saveFailed/)
})
