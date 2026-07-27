import {
  requireSimulationAdmin,
  simulationDataResponse,
  simulationErrorResponse,
  simulationOptionsResponse,
} from "@web/lib/simulation-api"
import { getSimulationService } from "@web/lib/simulation-runtime"
import { SimulationInputError } from "@web/lib/simulation-service"

export const runtime = "nodejs"

interface RouteContext {
  params: { id: string }
}

export function OPTIONS(request: Request) {
  return simulationOptionsResponse(request)
}

export async function GET(request: Request, { params }: RouteContext) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const service = await getSimulationService()
    const data = await service.repository.getRunDetail(params.id)
    if (!data) throw new SimulationInputError("Simulation run not found", 404)
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    const service = await getSimulationService()
    const data = await service.repository.archiveRun(
      params.id,
      new Date().toISOString(),
    )
    return simulationDataResponse(request, data, service.repository.meta)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
