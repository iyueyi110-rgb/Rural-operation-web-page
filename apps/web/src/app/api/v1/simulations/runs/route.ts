import type { PolicyVersion, SimulationConfig } from "@zouma/contracts"

import { isPlainObject } from "@web/lib/aigc-api"
import {
  requireSimulationAdmin,
  parseSimulationRunPage,
  simulationDataResponse,
  simulationErrorResponse,
  simulationOptionsResponse,
  simulationRunListResponse,
} from "@web/lib/simulation-api"
import { getSimulationService } from "@web/lib/simulation-runtime"
import { SimulationInputError } from "@web/lib/simulation-service"

export const runtime = "nodejs"

export function OPTIONS(request: Request) {
  return simulationOptionsResponse(request)
}

export async function GET(request: Request) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const service = await getSimulationService()
    const query = new URL(request.url).searchParams
    const pagination = parseSimulationRunPage(query)
    const policy = query.get("policyVersion")
    const status = query.get("status")
    const data = await service.repository.listRunSummaries(
      {
        ...(query.get("pairId") ? { pairId: query.get("pairId")! } : {}),
        ...(policy === "V0" || policy === "V1"
          ? { policyVersion: policy }
          : {}),
        ...(query.get("scenarioId")
          ? { scenarioId: query.get("scenarioId")! }
          : {}),
        ...(status === "pending" ||
        status === "running" ||
        status === "completed" ||
        status === "failed"
          ? { status }
          : {}),
        includeArchived: query.get("includeArchived") === "true",
      },
      pagination,
    )
    return simulationRunListResponse(
      request,
      data,
      service.repository.meta,
      pagination,
    )
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}

function policies(value: unknown): PolicyVersion[] | undefined {
  if (value === undefined) return undefined
  if (
    !Array.isArray(value) ||
    value.some((item) => item !== "V0" && item !== "V1")
  ) {
    throw new SimulationInputError("policyVersions only supports V0 and V1")
  }
  return value as PolicyVersion[]
}

export async function POST(request: Request) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const body = await request.json().catch(() => null)
    if (!isPlainObject(body))
      throw new SimulationInputError("A JSON request body is required")
    const config = isPlainObject(body.config)
      ? (body.config as Partial<SimulationConfig>)
      : {}
    const service = await getSimulationService()
    const data = await service.createRuns({
      config,
      policyVersions: policies(body.policyVersions),
      ...(typeof body.runName === "string"
        ? { runName: body.runName.trim() }
        : {}),
      ...(typeof body.policyRevision === "string"
        ? { policyRevision: body.policyRevision.trim() }
        : {}),
    })
    return simulationDataResponse(request, data, service.repository.meta, 201)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
