import { getChinaDateString, isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { demoApiDiagnosisResult } from "@web/lib/renovation-api-demo-data"
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
    if (!result.strategies.length) {
      return jsonResponse(request, {
        data: demoApiDiagnosisResult(body.nodeId.trim(), bizDate),
        meta: { created: false, degraded: true, demo: true, reason: "后端未生成策略，返回演示诊断" },
      })
    }
    return jsonResponse(request, { data: result, meta: { created: result.created } }, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("Renovation diagnose failed:", error)
    return jsonResponse(request, {
      data: demoApiDiagnosisResult(body.nodeId.trim(), bizDate),
      meta: { created: false, degraded: true, demo: true, reason: "改造诊断暂不可用，返回演示诊断" },
    })
  }
}
