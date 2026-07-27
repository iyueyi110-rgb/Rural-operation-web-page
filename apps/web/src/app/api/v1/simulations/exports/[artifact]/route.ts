import {
  artifactResponse,
  isSimulationArtifactName,
  requireSimulationAdmin,
  simulationErrorResponse,
  simulationOptionsResponse,
} from "@web/lib/simulation-api"
import { getSimulationService } from "@web/lib/simulation-runtime"
import { SimulationInputError } from "@web/lib/simulation-service"

export const runtime = "nodejs"

interface RouteContext {
  params: { artifact: string }
}

export function OPTIONS(request: Request) {
  return simulationOptionsResponse(request)
}

export async function GET(request: Request, { params }: RouteContext) {
  const unauthorized = requireSimulationAdmin(request)
  if (unauthorized) return unauthorized
  try {
    if (!isSimulationArtifactName(params.artifact)) {
      throw new SimulationInputError("Unknown simulation export artifact", 404)
    }
    const service = await getSimulationService()
    const query = new URL(request.url).searchParams
    let v0RunId = query.get("v0RunId")
    let v1RunId = query.get("v1RunId")
    const runId = query.get("runId")
    if ((!v0RunId || !v1RunId) && runId) {
      const run = await service.repository.getRun(runId)
      const pairRuns = run?.pairId
        ? await service.repository.listRuns({
            pairId: run.pairId,
            includeArchived: true,
          })
        : []
      v0RunId ??=
        pairRuns.find((item) => item.policyVersion === "V0")?.id ?? null
      v1RunId ??=
        pairRuns.find((item) => item.policyVersion === "V1")?.id ?? null
    }
    if (!v0RunId || !v1RunId) {
      throw new SimulationInputError(
        "v0RunId and v1RunId are required for export",
      )
    }
    const content = await service.exportArtifact(
      v0RunId,
      v1RunId,
      params.artifact,
    )
    return artifactResponse(request, params.artifact, content)
  } catch (error) {
    return simulationErrorResponse(request, error)
  }
}
