import assert from "node:assert/strict"
import test from "node:test"

import {
  GET as getBadCases,
  PATCH as patchBadCases,
} from "../app/api/v1/simulations/bad-cases/route"
import { POST as postComparisons } from "../app/api/v1/simulations/comparisons/route"
import { GET as getEvents } from "../app/api/v1/simulations/events/route"
import { GET as getExport } from "../app/api/v1/simulations/exports/[artifact]/route"
import {
  GET as getRun,
  DELETE as deleteRun,
} from "../app/api/v1/simulations/runs/[id]/route"
import { POST as cloneRun } from "../app/api/v1/simulations/runs/[id]/clone/route"
import {
  GET as getRuns,
  POST as postRuns,
} from "../app/api/v1/simulations/runs/route"

test("all simulation management methods reject unauthenticated requests before doing work", async () => {
  const previous = process.env.ADMIN_API_TOKEN
  process.env.ADMIN_API_TOKEN = "secret"
  try {
    const plain = () => new Request("http://localhost/api/v1/simulations/runs")
    const json = (method = "POST") =>
      new Request("http://localhost/api/v1/simulations/runs", {
        method,
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    const responses = await Promise.all([
      getRuns(plain()),
      postRuns(json()),
      getRun(plain(), { params: { id: "run-1" } }),
      deleteRun(plain(), { params: { id: "run-1" } }),
      cloneRun(json(), { params: { id: "run-1" } }),
      postComparisons(json()),
      getEvents(plain()),
      getBadCases(plain()),
      patchBadCases(json("PATCH")),
      getExport(plain(), { params: { artifact: "simulation_report.md" } }),
    ])

    assert.ok(responses.every((response) => response.status === 401))
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_TOKEN
    else process.env.ADMIN_API_TOKEN = previous
  }
})
