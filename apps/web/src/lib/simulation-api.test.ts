import assert from "node:assert/strict"
import test from "node:test"

import {
  artifactResponse,
  isSimulationArtifactName,
  requireSimulationAdmin,
  parseSimulationRunPage,
  simulationDataResponse,
  simulationErrorResponse,
  simulationRunListResponse,
} from "./simulation-api"
import {
  SimulationRepositoryInputError,
  SimulationRepositoryNotFoundError,
} from "./simulation-repository"

test("every simulation endpoint requires the configured admin token", async () => {
  const previous = process.env.ADMIN_API_TOKEN
  process.env.ADMIN_API_TOKEN = "secret"
  try {
    const denied = requireSimulationAdmin(
      new Request("http://localhost/api/v1/simulations/runs"),
    )
    assert.equal(denied?.status, 401)
    assert.deepEqual(await denied?.json(), { error: "Unauthorized" })

    const allowed = requireSimulationAdmin(
      new Request("http://localhost/api/v1/simulations/runs", {
        headers: { "x-admin-token": "secret" },
      }),
    )
    assert.equal(allowed, null)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_TOKEN
    else process.env.ADMIN_API_TOKEN = previous
  }
})

test("success responses consistently expose data and repository metadata", async () => {
  const request = new Request("http://localhost/api/v1/simulations/runs")
  const response = simulationDataResponse(request, [{ id: "run-1" }], {
    backend: "json",
    degraded: true,
    reason: "database unavailable",
  })

  assert.deepEqual(await response.json(), {
    data: [{ id: "run-1" }],
    meta: { backend: "json", degraded: true, reason: "database unavailable" },
  })
})

test("run-list pagination is bounded and exposes a stable summary envelope", async () => {
  assert.deepEqual(parseSimulationRunPage(new URLSearchParams()), {
    page: 1,
    pageSize: 25,
  })
  assert.deepEqual(
    parseSimulationRunPage(
      new URLSearchParams({ page: "3", pageSize: "10000" }),
    ),
    { page: 3, pageSize: 100 },
  )
  assert.deepEqual(
    parseSimulationRunPage(
      new URLSearchParams({ page: "invalid", pageSize: "-2" }),
    ),
    { page: 1, pageSize: 25 },
  )

  const response = simulationRunListResponse(
    new Request("http://localhost/api/v1/simulations/runs"),
    {
      items: [
        {
          id: "run-1",
          worldHash: "hash-1",
          config: { durationDays: 30 },
          metrics: { acceptance_rate: { value: 0.8 } },
        },
      ],
      hasMore: false,
    },
    { backend: "prisma", degraded: false },
    { page: 1, pageSize: 25 },
  )
  const body = await response.json()
  assert.deepEqual(body.meta.pagination, {
    page: 1,
    pageSize: 25,
    hasMore: false,
  })
  assert.equal(body.data.items[0].id, "run-1")
  assert.equal("result" in body.data.items[0], false)
})

test("exports reject unknown artifacts and send safe download headers", async () => {
  assert.equal(isSimulationArtifactName("simulation_events.csv"), true)
  assert.equal(isSimulationArtifactName("../../secrets"), false)

  const request = new Request(
    "http://localhost/api/v1/simulations/exports/simulation_events.csv",
    {
      headers: { origin: "http://localhost:3001" },
    },
  )
  const csv = artifactResponse(
    request,
    "simulation_events.csv",
    "id,eventType\n1,TASK_CREATED",
  )
  assert.match(csv.headers.get("content-type") ?? "", /^text\/csv/)
  assert.equal(
    csv.headers.get("content-disposition"),
    'attachment; filename="simulation_events.csv"',
  )
  assert.equal(
    csv.headers.get("access-control-allow-origin"),
    "http://localhost:3001",
  )
  assert.match(csv.headers.get("access-control-allow-methods") ?? "", /DELETE/)

  const report = artifactResponse(request, "simulation_report.md", "# Demo")
  assert.match(report.headers.get("content-type") ?? "", /^text\/markdown/)
})

test("API errors hide internal failures and map repository input/not-found failures", async () => {
  const request = new Request(
    "http://localhost/api/v1/simulations/runs/missing",
  )
  const internal = simulationErrorResponse(
    request,
    new Error("database password leaked"),
  )
  assert.equal(internal.status, 500)
  assert.deepEqual(await internal.json(), {
    error: "Simulation service failed",
  })

  const invalid = simulationErrorResponse(
    request,
    new SimulationRepositoryInputError("Invalid date"),
  )
  assert.equal(invalid.status, 400)
  const missing = simulationErrorResponse(
    request,
    new SimulationRepositoryNotFoundError("Run missing"),
  )
  assert.equal(missing.status, 404)
})
