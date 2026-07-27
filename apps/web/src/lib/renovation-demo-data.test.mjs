import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./renovation-demo-data.ts", import.meta.url), "utf8")

test("renovation demo data declares schematic photo assets for every node", () => {
  const nodeCount = (source.match(/slug: "/g) ?? []).length
  const photoUrlCount = (source.match(/photoUrl: "\/images\//g) ?? []).length
  const photoAltCount = (source.match(/photoAlt: "/g) ?? []).length

  assert.ok(nodeCount >= 6)
  assert.equal(photoUrlCount, nodeCount)
  assert.equal(photoAltCount, nodeCount)

  const photoUrls = Array.from(source.matchAll(/photoUrl: "([^"]+)"/g), (match) => match[1])
  for (const photoUrl of photoUrls) {
    assert.ok(existsSync(new URL(`../../public${photoUrl}`, import.meta.url)), `${photoUrl} should exist in public assets`)
  }
})
