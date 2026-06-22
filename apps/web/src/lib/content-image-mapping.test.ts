import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { courtyardOptions } from "./courtyards-data"
import { historySections } from "./history-data"
import { orchardTreeOptions } from "./trees-data"

const realmMapSource = readFileSync(
  new URL("../components/realm-map-gateway.tsx", import.meta.url),
  "utf8",
)

test("assigns every adoptable tree its own generated portrait", () => {
  const assets = orchardTreeOptions.map((tree) => tree.imageAsset)

  assert.equal(new Set(assets).size, orchardTreeOptions.length)
  assert.deepEqual(assets, [
    "/images/trees/lz018-feizixiao-v2.webp",
    "/images/trees/lz026-guiwei-v2.webp",
    "/images/trees/lz041-old-tree-v2.webp",
  ])
  assets.forEach((asset) => {
    assert.ok(existsSync(new URL(`../../public${asset}`, import.meta.url)))
  })
})

test("assigns each history chapter a content-specific generated image", () => {
  assert.deepEqual(
    historySections.map((section) => section.imageUrl),
    [
      "/images/history/tang-lewen-v2.webp",
      "/images/history/lychee-road-v2.webp",
      "/images/history/qing-milestone-v2.webp",
      "/images/history/modern-zouma.webp",
    ],
  )
  historySections.forEach((section) => {
    assert.ok(
      existsSync(new URL(`../../public${section.imageUrl}`, import.meta.url)),
    )
  })
})

test("replaces the two mismatched courtyard photos", () => {
  const assets = Object.fromEntries(
    courtyardOptions.map((courtyard) => [courtyard.id, courtyard.imageAsset]),
  )

  assert.equal(
    assets["lychee-food-courtyard"],
    "/images/courtyards/lychee-food-courtyard.webp",
  )
  assert.equal(
    assets["ancient-road-station"],
    "/images/courtyards/ancient-road-station.webp",
  )
})

test("centers AMap on Changshou Zouma Village and labels the village", () => {
  assert.match(realmMapSource, /const zoumaVillageCenter/)
  assert.match(realmMapSource, /107\.067/)
  assert.match(realmMapSource, /29\.8255/)
  assert.match(realmMapSource, /mapGateway\.locationLabel/)
})
