import {
  requireSimulationAdmin,
  simulationDataResponse,
  simulationErrorResponse,
  simulationOptionsResponse,
} from "@web/lib/simulation-api"
import { getSimulationService } from "@web/lib/simulation-runtime"

export const runtime = "nodejs"

interface RouteContext {
  params: { id: string }
}

export function OPTIONS(request: Request) {
  return simulationOptionsResponse(request)
}

export async function POST(request: Request, { params }: RouteContext) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const service = await getSimulationService()
    const data = await service.cloneRun(params.id)
    return simulationDataResponse(request, data, service.repository.meta, 201)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
