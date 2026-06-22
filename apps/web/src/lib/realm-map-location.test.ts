import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const mapSource = readFileSync(
  new URL("../components/realm-map-gateway.tsx", import.meta.url),
  "utf8",
)

test("centers the homepage map on the real Zoumaling village area", () => {
  assert.match(
    mapSource,
    /const zoumaVillageCenter: Coordinate = \[107\.1055, 29\.8105\]/,
  )
  assert.doesNotMatch(mapSource, /legacyCenter|relocateToChangshou/)
  assert.match(mapSource, /\[107\.099141, 29\.812567\]/)
  assert.match(mapSource, /\[107\.102516, 29\.808982\]/)
})

test("uses satellite imagery and matching realm labels without color blocks", () => {
  assert.match(mapSource, /new AMap\.TileLayer\.Satellite\(\)/)
  assert.match(mapSource, /World_Imagery\/MapServer\/tile/)
  assert.doesNotMatch(mapSource, /new AMap\.Polygon|L\.polygon/)
  assert.match(mapSource, /label\.textContent = t\(realm\.titleKey\)/)
  assert.match(mapSource, /\[107\.1038, 29\.8063\]/)
})
