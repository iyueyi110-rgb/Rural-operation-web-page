import { getChinaDateString, isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { generateRenovationForNode } from "@web/lib/renovation-service"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "renovation-diagnose"), 5, 300)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = await request.json().catch(() => null)
  if (!isPlainObject(body) || typeof body.nodeId !== "string" || !body.nodeId.trim()) {
    return jsonResponse(request, { error: "nodeId is required" }, { status: 400 })
  }

  const bizDate = typeof body.bizDate === "string" && body.bizDate.trim() ? body.bizDate.trim() : getChinaDateString()

  try {
    const result = await generateRenovationForNode(body.nodeId.trim(), bizDate)
    return jsonResponse(request, { data: result, meta: { created: result.created } }, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("Renovation diagnose failed:", error)
    return jsonResponse(request, { error: "Renovation diagnose failed" }, { status: 500 })
  }
}
