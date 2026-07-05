import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const componentSource = readFileSync(
  new URL("../components/renovation-spatial-diagram.tsx", import.meta.url),
  "utf8",
)

test("renovation spatial diagram cards render schematic photos", () => {
  assert.match(componentSource, /getRenovationDemoPhoto/)
  assert.match(componentSource, /role="img"/)
  assert.match(componentSource, /node\.photoUrl/)
  assert.match(componentSource, /空间改造节点示意照片/)
})
