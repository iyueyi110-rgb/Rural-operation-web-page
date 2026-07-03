import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("../components/home-mobile-menu.tsx", import.meta.url),
  "utf8",
)

test("home mobile menu opens from pointerdown for touch and mouse input", () => {
  assert.match(source, /onPointerDown=\{\(event\) => \{[\s\S]*setOpen\(true\)/)
})
