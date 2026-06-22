import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeZoumaVillageCoordinate,
  zoumaVillageCenter,
  zoumaVillageLabel,
} from "./map-location"

test("centers map monitoring on Zouma Village in Changshou District", () => {
  assert.deepEqual(zoumaVillageCenter, [29.8105, 107.1055])
  assert.equal(zoumaVillageLabel, "重庆市长寿区凤城街道走马村")
})

test("moves legacy Jiulongpo-area coordinates into the Changshou village frame", () => {
  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.8512, 106.321),
    [29.8105, 107.1055],
  )

  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.812, 107.107),
    [29.812, 107.107],
  )
})

test("places known operation nodes inside the current Zouma range", () => {
  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.8255, 107.067, "visitor-center"),
    [29.8062, 107.102],
  )
  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.8305, 107.076, "ridge-dwelling-core"),
    [29.8053, 107.1133],
  )
})
