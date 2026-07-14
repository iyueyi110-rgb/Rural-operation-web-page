import type { SimulationExportArtifactName } from "@zouma/contracts"

import { getCorsHeaders, jsonResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/admin-request"
import {
  SimulationRepositoryInputError,
  SimulationRepositoryNotFoundError,
  type SimulationRepositoryMeta,
} from "@web/lib/simulation-repository"
import { SimulationInputError } from "@web/lib/simulation-service"

const artifactNames = new Set<SimulationExportArtifactName>([
  "simulation_config.json",
  "simulation_runs.csv",
  "simulation_events.csv",
  "simulation_tasks.csv",
  "simulation_assignments.csv",
  "simulation_submissions.csv",
  "simulation_reviews.csv",
  "simulation_bad_cases.csv",
  "simulation_metrics.json",
  "simulation_comparison.json",
  "simulation_report.md",
])

export function isSimulationArtifactName(
  value: string,
): value is SimulationExportArtifactName {
  return artifactNames.has(value as SimulationExportArtifactName)
}

export function requireSimulationAdmin(request: Request): Response | null {
  return isAdminRequest(request)
    ? null
    : jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
}

export function simulationDataResponse(
  request: Request,
  data: unknown,
  meta: SimulationRepositoryMeta,
  status = 200,
) {
  return jsonResponse(request, { data, meta }, { status })
}

export interface SimulationRunPage {
  page: number
  pageSize: number
}

function positiveInteger(value: string | null, fallback: number) {
  if (!value || !/^\d+$/u.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function parseSimulationRunPage(query: URLSearchParams) {
  return {
    page: positiveInteger(query.get("page"), 1),
    pageSize: Math.min(positiveInteger(query.get("pageSize"), 25), 100),
  }
}

export function simulationRunListResponse(
  request: Request,
  data: { items: unknown[]; hasMore: boolean },
  meta: SimulationRepositoryMeta,
  pagination: SimulationRunPage,
) {
  return jsonResponse(
    request,
    {
      data: { items: data.items },
      meta: {
        ...meta,
        pagination: { ...pagination, hasMore: data.hasMore },
      },
    },
    { status: 200 },
  )
}

export function simulationErrorResponse(request: Request, error: unknown) {
  const status =
    error instanceof SimulationInputError
      ? error.status
      : error instanceof SimulationRepositoryInputError
        ? 400
        : error instanceof SimulationRepositoryNotFoundError
          ? 404
          : 500
  const message =
    status === 500
      ? "Simulation service failed"
      : error instanceof Error
        ? error.message
        : "Simulation request failed"
  if (status === 500) console.error("Simulation API failed:", error)
  return jsonResponse(request, { error: message }, { status })
}

export function artifactResponse(
  request: Request,
  artifact: SimulationExportArtifactName,
  content: string,
) {
  const contentType = artifact.endsWith(".csv")
    ? "text/csv; charset=utf-8"
    : artifact.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : "application/json; charset=utf-8"
  return new Response(content, {
    headers: {
      ...getCorsHeaders(request),
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${artifact}"`,
    },
  })
}

export function simulationOptionsResponse(request: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}
