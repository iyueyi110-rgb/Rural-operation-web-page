import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const pageSource = readFileSync(
  new URL("../app/(village-work)/simulations/page.tsx", import.meta.url),
  "utf8",
)
const navSource = readFileSync(
  new URL("./admin-navigation.ts", import.meta.url),
  "utf8",
)
const detailSource = readFileSync(
  new URL("../components/simulation/detail-panel.tsx", import.meta.url),
  "utf8",
)
const eventsSource = readFileSync(
  new URL("../components/simulation/events-panel.tsx", import.meta.url),
  "utf8",
)
const badCasesSource = readFileSync(
  new URL("../components/simulation/bad-cases-panel.tsx", import.meta.url),
  "utf8",
)
const comparisonSource = readFileSync(
  new URL("../components/simulation/comparison-panel.tsx", import.meta.url),
  "utf8",
)
const sharedSource = readFileSync(
  new URL("../components/simulation/shared.tsx", import.meta.url),
  "utf8",
)
const simulationTypesSource = readFileSync(
  new URL("../components/simulation/types.ts", import.meta.url),
  "utf8",
)

test("adds the rule simulation module to village collaboration navigation", () => {
  assert.match(navSource, /label: "规则模拟"/)
  assert.match(navSource, /href: "\/simulations"/)
  assert.match(navSource, /group: "villageWork"/)
})

test("covers all simulation workflows with authenticated admin API calls", () => {
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\(\s*"\/simulations\/runs\?page=1&pageSize=50"/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\(\s*`\/simulations\/runs\/\$\{[^}]+\}`/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\(\s*`\/simulations\/runs\/\$\{[^}]+\}\/clone`/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\("\/simulations\/comparisons"/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\(\s*`\/simulations\/events\?/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\("\/simulations\/bad-cases"/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\s*\(\s*`\/simulations\/bad-cases\?/,
  )
  assert.match(pageSource, /\/simulations\/exports\/\$\{artifact\}/)
})

test("loads full paired details on demand before rendering comparison breakdowns", () => {
  assert.match(
    pageSource,
    /Promise\.all\(\[\s*fetchAdminApi<[^>]+>\(\s*`\/simulations\/runs\/\$\{comparisonIds\.v0RunId\}`/,
  )
  assert.match(
    pageSource,
    /fetchAdminApi<[^>]+>\(\s*`\/simulations\/runs\/\$\{comparisonIds\.v1RunId\}`/,
  )
  assert.match(pageSource, /setRuns\(\(current\)\s*=>/)
})

test("keeps the simulation evidence boundary visible and handles unavailable APIs", () => {
  assert.match(pageSource, /模拟运营数据，不代表真实业务结果/)
  assert.match(pageSource, /dataOrigin/)
  assert.match(pageSource, /simulationRunId/)
  assert.match(pageSource, /policyVersion/)
  assert.match(pageSource, /模拟种子/)
  assert.match(pageSource, /meta\.degraded/)
  assert.match(pageSource, /meta\.backend/)
  assert.match(pageSource, /meta\.reason/)
  assert.match(pageSource, /catch \(caughtError\)/)
})

test("shows complete configuration, rule evidence checks, and four comparison breakdowns", () => {
  assert.match(detailSource, /模拟完整配置/)
  assert.match(detailSource, /基于规则的模拟凭证检查/)
  assert.match(detailSource, /模拟通过/)
  assert.match(detailSource, /模拟失败/)
  assert.match(detailSource, /模拟待检查/)
  const comparisonContract = `${comparisonSource}\n${simulationTypesSource}`
  assert.match(comparisonContract, /模拟任务类型分解/)
  assert.match(comparisonContract, /模拟区域分解/)
  assert.match(comparisonContract, /模拟当前场景效果/)
  assert.match(comparisonContract, /模拟执行者负荷分解/)
  assert.match(badCasesSource, /模拟 V0\/V1 分类数量对比/)
})

test("labels filters and exports and exposes live notice semantics", () => {
  assert.doesNotMatch(
    eventsSource,
    /<input className=\{controlClass\} (?!aria-label)/,
  )
  assert.match(pageSource, /aria-label="模拟导出文件"/)
  assert.match(badCasesSource, /aria-label="模拟 Bad Case 运行筛选"/)
  assert.match(sharedSource, /role=\{tone === "error" \? "alert" : "status"\}/)
  assert.match(sharedSource, /aria-live=/)
})

test("connects tabs and tab panels with accessible semantics", () => {
  assert.match(pageSource, /role="tablist"/)
  assert.match(pageSource, /role="tab"/)
  assert.match(pageSource, /aria-selected=/)
  assert.match(pageSource, /aria-controls=/)
  assert.match(pageSource, /role="tabpanel"/)
  assert.match(pageSource, /aria-labelledby=/)
})
