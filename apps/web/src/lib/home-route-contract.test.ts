import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
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

const heroSource = readFileSync(
  new URL("../components/hero-screen.tsx", import.meta.url),
  "utf8",
)

const pageDeckUrl = new URL(
  "../components/fullscreen-page-deck.tsx",
  import.meta.url,
)
const pageDeckSource = existsSync(pageDeckUrl)
  ? readFileSync(pageDeckUrl, "utf8")
  : ""

test("routes the primary homepage actions to dedicated destinations", () => {
  assert.equal(buildExploreHref("zh-CN"), "/zh-CN/explore")
  assert.equal(buildExploreHref("en", "realms"), "/en/explore#realms")
  assert.equal(buildAdoptionHref("ja"), "/ja/trees")
})

test("uses a four-page homepage deck with history after the hero", () => {
  assert.match(homePageSource, /HomeAdoptionFeature/)
  assert.match(homePageSource, /FullscreenPageDeck/)
  assert.match(homePageSource, /HistoryScroll/)
  assert.match(homePageSource, /RealmMapGateway/)
  assert.ok(
    homePageSource.indexOf("<HeroScreen") <
      homePageSource.indexOf("<HistoryScroll"),
  )
  assert.ok(
    homePageSource.indexOf("<HistoryScroll") <
      homePageSource.indexOf("<RealmMapGateway"),
  )
  assert.ok(
    homePageSource.indexOf("<RealmMapGateway") <
      homePageSource.indexOf("<HomeAdoptionFeature"),
  )
  assert.match(explorePageSource, /ExploreExperience/)
  assert.match(exploreExperienceSource, /HistoryScroll/)
  assert.match(exploreExperienceSource, /RealmMapGateway/)
})

test("supports button, wheel, keyboard and touch page navigation", () => {
  assert.match(heroSource, /zouma:home-deck-next/)
  assert.match(pageDeckSource, /ArrowDown|PageDown/)
  assert.match(pageDeckSource, /ArrowUp|PageUp/)
  assert.match(pageDeckSource, /onWheel/)
  assert.match(pageDeckSource, /onTouchStart/)
  assert.match(pageDeckSource, /onTouchEnd/)
  assert.match(pageDeckSource, /aria-current/)
  assert.match(pageDeckSource, /overflow-clip/)
})

test("keeps the start browsing action functional outside desktop deck mode", () => {
  assert.match(heroSource, /buildExploreHref\(locale\)/)
  assert.match(heroSource, /md:hidden/)
})
