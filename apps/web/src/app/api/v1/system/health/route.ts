import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  return jsonResponse(request, {
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  })
}
