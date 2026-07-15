import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const demoSource = readFileSync(new URL("./renovation-demo-data.ts", import.meta.url), "utf8")
const listPageSource = readFileSync(
  new URL("../app/(renovation)/renovation/page.tsx", import.meta.url),
  "utf8",
)
const detailPageSource = readFileSync(
  new URL("../app/(renovation)/renovation/[id]/page.tsx", import.meta.url),
  "utf8",
)
const assessmentPageSource = readFileSync(
  new URL("../app/(renovation)/assessments/page.tsx", import.meta.url),
  "utf8",
)

test("renovation admin pages keep complete demo fallback data wired", () => {
  for (const slug of ["ancient-road", "lychee-garden", "waterfront-rest", "ridge-courtyard", "village-meal", "tree-adoption"]) {
    assert.match(demoSource, new RegExp(`slug: "${slug}"`))
  }
  assert.match(demoSource, /id: `demo-strategy-\$\{slug\}`/)

  assert.match(listPageSource, /demoRenovationStrategies/)
  assert.match(listPageSource, /StrategyPhotoThumb/)
  assert.match(detailPageSource, /getDemoRenovationStrategy/)
  assert.match(detailPageSource, /sectionRows/)
  assert.match(assessmentPageSource, /demoBuildingAssessments/)
  assert.match(assessmentPageSource, /AssessmentPhotoThumb/)
})
