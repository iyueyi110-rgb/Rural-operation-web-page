import { readFile } from "node:fs/promises"

const file = process.argv[2] ?? "outputs/simulation/regression-summary.json"
const payload = JSON.parse(await readFile(file, "utf8"))
const rows = payload.results
if (!Array.isArray(rows) || rows.length !== 40) throw new Error("Regression matrix must contain 40 rows")
const seeds = new Set(rows.map((row) => row.seed))
const scenarios = new Set(rows.map((row) => row.scenario))
if (seeds.size !== 5 || scenarios.size !== 8) throw new Error("Regression matrix dimensions must be 5 seeds × 8 scenarios")
for (const scenario of scenarios) {
  if (rows.filter((row) => row.scenario === scenario).length !== 5) {
    throw new Error(`Scenario ${scenario} must contain 5 rows`)
  }
}
const mismatches = rows.filter((row) => row.v0WorldHash !== row.v1WorldHash)
if (mismatches.length > 0) throw new Error(`Found ${mismatches.length} worldHash mismatches`)
console.log(JSON.stringify({ rows: rows.length, seeds: seeds.size, scenarios: scenarios.size, worldHashMismatches: 0 }, null, 2))
