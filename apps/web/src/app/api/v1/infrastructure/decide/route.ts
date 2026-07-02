import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateControlCommands } from "@web/lib/infrastructure-control"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { isAdminRequest } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "infrastructure-decide"), 5, 60)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  try {
    const data = await generateControlCommands()
    return jsonResponse(
      request,
      {
        data,
        meta: {
          total: data.length,
          degraded: data.length === 0,
          reason: data.length === 0 ? "传感器和客流样本不足，暂无自动处置建议" : undefined,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Infrastructure decision failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: {
        total: 0,
        degraded: true,
        reason: "决策服务暂时不可用，请稍后重试",
      },
    })
  }
}
