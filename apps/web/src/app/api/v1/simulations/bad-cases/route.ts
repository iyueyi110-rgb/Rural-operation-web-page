import { isPlainObject } from "@web/lib/aigc-api"
import {
  requireSimulationAdmin,
  simulationDataResponse,
  simulationErrorResponse,
  simulationOptionsResponse,
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
    const policy = query.get("policyVersion")
    const data = await service.repository.listBadCases({
      ...(query.get("runId") ? { runId: query.get("runId")! } : {}),
      ...(query.get("category") ? { category: query.get("category")! } : {}),
      ...(query.get("severity") ? { severity: query.get("severity")! } : {}),
      ...(policy === "V0" || policy === "V1" ? { policyVersion: policy } : {}),
    })
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}

export async function PATCH(request: Request) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const body = await request.json().catch(() => null)
    if (!isPlainObject(body) || typeof body.id !== "string") {
      throw new SimulationInputError("Bad case id is required")
    }
    const service = await getSimulationService()
    const existing = (await service.repository.listBadCases()).find(
      (item) => item.id === body.id,
    )
    if (!existing)
      throw new SimulationInputError("Simulation bad case not found", 404)
    const data = await service.repository.updateBadCase(body.id, {
      rootCause:
        typeof body.rootCause === "string"
          ? body.rootCause.trim() || null
          : existing.rootCause,
      improvementAction:
        typeof body.improvementAction === "string"
          ? body.improvementAction.trim() || null
          : existing.improvementAction,
    })
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
