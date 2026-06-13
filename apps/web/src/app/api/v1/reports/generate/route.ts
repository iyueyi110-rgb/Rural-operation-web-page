import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateDailyReport } from "@web/lib/report-generator"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
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
