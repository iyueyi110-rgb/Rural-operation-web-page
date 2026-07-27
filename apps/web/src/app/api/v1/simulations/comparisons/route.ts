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

export async function POST(request: Request) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const body = await request.json().catch(() => null)
    if (
      !isPlainObject(body) ||
      typeof body.v0RunId !== "string" ||
      typeof body.v1RunId !== "string"
    ) {
      throw new SimulationInputError("v0RunId and v1RunId are required")
    }
    const service = await getSimulationService()
    const data = await service.compareRuns(body.v0RunId, body.v1RunId)
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
