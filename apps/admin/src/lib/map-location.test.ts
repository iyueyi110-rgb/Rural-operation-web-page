import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeZoumaVillageCoordinate,
  zoumaVillageCenter,
  zoumaVillageLabel,
} from "./map-location"

test("centers map monitoring on Zouma Village in Changshou District", () => {
  assert.deepEqual(zoumaVillageCenter, [29.8255, 107.067])
  assert.equal(zoumaVillageLabel, "重庆市长寿区凤城街道走马村")
})

test("moves legacy Jiulongpo-area coordinates into the Changshou village frame", () => {
  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.8512, 106.321),
    [29.8255, 107.067],
  )

  assert.deepEqual(
    normalizeZoumaVillageCoordinate(29.827, 107.069),
    [29.827, 107.069],
  )
})
