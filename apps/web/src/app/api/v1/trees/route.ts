import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { listTreeProfiles } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const trees = await listTreeProfiles()
  return jsonResponse(request, { data: trees, meta: { total: trees.length } })
}
