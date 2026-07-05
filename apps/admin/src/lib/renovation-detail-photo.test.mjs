import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const pageSource = readFileSync(
  new URL("../app/(renovation)/renovation/[id]/page.tsx", import.meta.url),
  "utf8",
)
const adminPublicDir = new URL("../../public/", import.meta.url)

test("renovation strategy detail renders a schematic photo panel", () => {
  assert.match(pageSource, /function getStrategyPhoto/)
  assert.match(pageSource, /空间改造示意照片/)
  assert.match(pageSource, /role="img"/)
  assert.match(pageSource, /\/images\/renovation\/ai\/village-meal-granary\.jpg/)

  const photoUrls = Array.from(pageSource.matchAll(/url: "(\/images\/renovation\/[^"]+)"/g), (match) => match[1])
  assert.ok(photoUrls.length >= 6)
  assert.equal(photoUrls.filter((photoUrl) => photoUrl.startsWith("/images/renovation/ai/")).length, 6)
  for (const photoUrl of photoUrls) {
    assert.ok(existsSync(new URL(`.${photoUrl}`, adminPublicDir)), `${photoUrl} should exist in admin public assets`)
  }
})
