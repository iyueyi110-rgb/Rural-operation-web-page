import { getChinaDateString, isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { runWeeklyRenovationDiagnosis } from "@web/lib/renovation-service"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "renovation-weekly"), 2, 300)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = await request.json().catch(() => null)
  const bizDate =
    isPlainObject(body) && typeof body.bizDate === "string" && body.bizDate.trim()
      ? body.bizDate.trim()
      : getChinaDateString()

  try {
    const data = await runWeeklyRenovationDiagnosis(bizDate)
    return jsonResponse(request, { data }, { status: 201 })
  } catch (error) {
    console.error("Weekly renovation diagnosis failed:", error)
    return jsonResponse(request, { error: "Weekly renovation diagnosis failed" }, { status: 500 })
  }
}
