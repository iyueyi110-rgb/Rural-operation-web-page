import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url)
  assert.equal(existsSync(sourceUrl), true, `${relativePath} should exist`)
  return readFileSync(sourceUrl, "utf8")
}

const pageSource = readSource("../app/[locale]/demo/page.tsx")
const journeySource = readSource("../app/[locale]/demo/demo-journey.tsx")
const readinessSource = readSource("./demo-readiness.server.ts")
const headerSource = readSource("../components/home-header.tsx")
const navSource = readSource("./visitor-navigation.ts")

test("portfolio demo exposes the LZ-018 route from desktop and mobile navigation", () => {
  assert.match(headerSource, /demoNavItem\.href/)
  assert.match(navSource, /href: `\/\$\{locale\}\/demo`/)
  assert.match(navSource, /mobileItems:\s*\[\s*demoNavItem/)
  assert.match(pageSource, /LZ-018/)
})

test("portfolio demo keeps seven implemented handoff steps and real deep links", () => {
  assert.equal((journeySource.match(/id: "/gu) ?? []).length, 7)
  assert.match(journeySource, /\/trees\/LZ-018/)
  assert.match(journeySource, /\/villager\/login/)
  assert.match(journeySource, /\/villager\/tasks/)
  assert.match(journeySource, /\$\{adminBaseUrl\}\/tasks/)
  assert.match(journeySource, /\$\{adminBaseUrl\}\/simulations/)
})

test("portfolio demo distinguishes full data from read-only degradation", () => {
  assert.match(readinessSource, /ADOPTION_V2_ENABLED/)
  assert.match(readinessSource, /ADOPT-2026-LZ018-001/)
  assert.match(readinessSource, /mode: "readonly"/)
  assert.match(pageSource, /readiness\.mode/)
  assert.match(journeySource, /mode: "full" \| "readonly"/)
  assert.doesNotMatch(pageSource, /写入成功|审核成功|结算成功/)
})

test("all locales label demo and simulated operations data boundaries", () => {
  const localeMessages = ["zh-CN", "en", "ja"].map(
    (locale) =>
      JSON.parse(readSource(`../../messages/${locale}.json`)) as {
        home: { nav: { demo: string; demoLogin: string } }
        portfolioDemo: { disclaimer: string; steps: Record<string, unknown> }
      },
  )

  for (const messages of localeMessages) {
    assert.ok(messages.home.nav.demo)
    assert.ok(messages.home.nav.demoLogin)
    assert.ok(messages.portfolioDemo.disclaimer)
    assert.equal(Object.keys(messages.portfolioDemo.steps).length, 7)
  }

  assert.match(
    localeMessages[0].portfolioDemo.disclaimer,
    /模拟运营数据，不代表真实业务结果/,
  )
})
