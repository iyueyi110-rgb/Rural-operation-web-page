import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildAdoptionHref,
  buildExploreHref,
} from "./home-navigation"

const homePageSource = readFileSync(
  new URL("../app/[locale]/page.tsx", import.meta.url),
  "utf8",
)

const explorePageSource = readFileSync(
  new URL("../app/[locale]/explore/page.tsx", import.meta.url),
  "utf8",
)

const exploreExperienceSource = readFileSync(
  new URL("../components/explore-experience.tsx", import.meta.url),
  "utf8",
)

test("routes the primary homepage actions to dedicated destinations", () => {
  assert.equal(buildExploreHref("zh-CN"), "/zh-CN/explore")
  assert.equal(buildExploreHref("en", "realms"), "/en/explore#realms")
  assert.equal(buildAdoptionHref("ja"), "/ja/trees")
})

test("keeps the complete three-stage flow and adoption on the homepage", () => {
  assert.match(homePageSource, /HomeAdoptionFeature/)
  assert.match(homePageSource, /HistoryScroll/)
  assert.match(homePageSource, /RealmMapGateway/)
  assert.match(explorePageSource, /ExploreExperience/)
  assert.match(exploreExperienceSource, /HistoryScroll/)
  assert.match(exploreExperienceSource, /RealmMapGateway/)
})
