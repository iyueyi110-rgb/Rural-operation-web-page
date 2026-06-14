import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { runAutoResolution } from "@web/lib/auto-resolution"
import { generateDailyReport } from "@web/lib/report-generator"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get("secret")

  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return jsonResponse(
      request,
      { error: { code: "UNAUTHORIZED", message: "Cron secret is invalid." } },
      { status: 401 },
    )
  }

  const date = url.searchParams.get("date") ?? getChinaDateString()

  try {
    const autoResolved = await runAutoResolution(date)
    const data = await generateDailyReport(date)
    return jsonResponse(request, { generated: true, date, autoResolved, data })
  } catch (error) {
    console.error("Cron daily report generation failed:", error)
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
