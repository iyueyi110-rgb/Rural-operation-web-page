import { prisma } from "@zouma/database"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { isAdminRequest } from "@web/lib/tree-records"

import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateDailyReport } from "@web/lib/report-generator"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from") ?? undefined
  const to = url.searchParams.get("to") ?? undefined
  const where =
    from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : undefined
  const data = await prisma.dailyReport.findMany({
    where,
    orderBy: { date: "desc" },
  })

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
    },
  })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "reports"), 3, 300)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = await request.json().catch(() => null)
  const date = typeof body?.date === "string" && body.date ? body.date : getChinaDateString()

  try {
    const data = await generateDailyReport(date)
    return jsonResponse(request, { data }, { status: 201 })
  } catch (error) {
    console.error("Daily report generation failed:", error)
    return jsonResponse(
      request,
      {
        error: {
          code: "REPORT_GENERATION_FAILED",
          message: error instanceof Error ? error.message : "AI service unavailable.",
        },
      },
      { status: 503 },
    )
  }
}
