import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { paginateArray, parsePaginationParams } from "@web/lib/pagination"
import { listTreeProfiles } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const params = parsePaginationParams(searchParams)
  const species = searchParams.get("species")?.trim()
  const adoptStatus = searchParams.get("adoptStatus")?.trim()
  const trees = await listTreeProfiles()
  const filtered = trees.filter((tree) => {
    const matchesSpecies = !species || tree.species.includes(species)
    const matchesStatus = !adoptStatus || tree.adoptStatus === adoptStatus
    return matchesSpecies && matchesStatus
  })
  return jsonResponse(request, paginateArray(filtered, params))
}
