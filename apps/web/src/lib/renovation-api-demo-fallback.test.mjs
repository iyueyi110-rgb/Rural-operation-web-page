import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

const demoSource = source("./renovation-api-demo-data.ts")
const serviceSource = source("./renovation-service.ts")
const contractSource = readFileSync(new URL("../../../../packages/contracts/src/index.ts", import.meta.url), "utf8")
const routeSources = [
  "../app/api/v1/renovation/strategies/route.ts",
  "../app/api/v1/renovation/strategies/[id]/route.ts",
  "../app/api/v1/renovation/assessments/route.ts",
  "../app/api/v1/renovation/public/route.ts",
  "../app/api/v1/renovation/run-weekly/route.ts",
  "../app/api/v1/renovation/diagnose/route.ts",
].map(source)

test("renovation api routes return demo data when backend data is missing", () => {
  for (const helper of ["demoApiStrategies", "demoApiStrategyDetail", "demoApiAssessments", "demoApiWeeklyResult", "demoApiDiagnosisResult"]) {
    assert.match(demoSource, new RegExp(`export function ${helper}`))
  }

  for (const routeSource of routeSources) {
    assert.match(routeSource, /degraded: true/)
    assert.match(routeSource, /demo: true/)
    assert.doesNotMatch(routeSource, /data: \[\],\n\s+meta: \{ degraded: true/)
  }

  assert.match(contractSource, /photoUrl\?: string/)
  assert.match(contractSource, /photoAlt\?: string/)
  assert.match(serviceSource, /publicRenovationPhotoBySlug/)
  assert.match(serviceSource, /photoUrl: photo\?\.photoUrl/)
})
