import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateControlCommands } from "@web/lib/infrastructure-control"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const data = await generateControlCommands()
  return jsonResponse(request, { data, meta: { total: data.length } }, { status: 201 })
}
