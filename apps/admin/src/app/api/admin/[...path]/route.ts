import { proxyAdminRequest } from "@admin/lib/admin-bff.server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: { path: string[] }
}

function handler(request: Request, { params }: RouteContext) {
  return proxyAdminRequest(request, params.path, {
    sessionSecret: process.env.ADMIN_SESSION_SECRET ?? "",
    webApiBase: process.env.WEB_API_BASE ?? "http://localhost:3000/api/v1",
    adminApiToken: process.env.ADMIN_API_TOKEN ?? "",
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
