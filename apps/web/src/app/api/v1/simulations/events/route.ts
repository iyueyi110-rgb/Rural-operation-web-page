import {
  requireSimulationAdmin,
  simulationDataResponse,
  simulationErrorResponse,
  simulationOptionsResponse,
} from "@web/lib/simulation-api"
import { getSimulationService } from "@web/lib/simulation-runtime"

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
    const seed = query.get("randomSeed")
    const data = await service.repository.listEvents({
      ...(query.get("runId") ? { runId: query.get("runId")! } : {}),
      ...(query.get("scenarioId")
        ? { scenarioId: query.get("scenarioId")! }
        : {}),
      ...(seed !== null && Number.isInteger(Number(seed))
        ? { randomSeed: Number(seed) }
        : {}),
      ...(query.get("adoptionId")
        ? { adoptionId: query.get("adoptionId")! }
        : {}),
      ...(query.get("taskId") ? { taskId: query.get("taskId")! } : {}),
      ...(query.get("entityType")
        ? { entityType: query.get("entityType")! }
        : {}),
      ...(query.get("entityId") ? { entityId: query.get("entityId")! } : {}),
      ...(query.get("actorId") ? { actorId: query.get("actorId")! } : {}),
      ...(query.get("actorType") ? { actorType: query.get("actorType")! } : {}),
      ...(query.get("eventType") ? { eventType: query.get("eventType")! } : {}),
      ...(policy === "V0" || policy === "V1" ? { policyVersion: policy } : {}),
      ...((query.get("from") ?? query.get("startTime"))
        ? { from: (query.get("from") ?? query.get("startTime"))! }
        : {}),
      ...((query.get("to") ?? query.get("endTime"))
        ? { to: (query.get("to") ?? query.get("endTime"))! }
        : {}),
    })
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
