import { apiError } from "@web/lib/api-error"
import { runAdoptionAgent } from "@web/lib/adoption-agent"
import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isFeatureEnabled } from "@web/lib/feature-flags"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}
export function GET(request: Request) {
  return apiError(request, "METHOD_NOT_ALLOWED", "Method not allowed", 405)
}

export async function POST(request: Request) {
  const secret = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/iu, "")
    .trim()
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return apiError(request, "UNAUTHORIZED", "Cron secret is invalid", 401)
  if (!isFeatureEnabled("ADOPTION_AGENT_SHADOW_ENABLED"))
    return apiError(
      request,
      "FEATURE_DISABLED",
      "Adoption agent shadow mode is disabled",
      503,
    )
  const data = await runAdoptionAgent({ triggerType: "daily", limit: 20 })
  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      completed: data.filter((item) => item.status === "completed").length,
      failed: data.filter((item) => item.status === "failed").length,
    },
  })
}
