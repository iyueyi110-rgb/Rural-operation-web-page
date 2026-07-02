import {
  getChinaDateString,
  jsonResponse,
  optionsResponse,
} from "@web/lib/aigc-api"
import { runAutoResolution } from "@web/lib/auto-resolution"
import { generateDailyReport } from "@web/lib/report-generator"

function buildFallbackDailyReport(date: string) {
  return {
    date,
    title: `走马村运营日报（${date}）`,
    summary: "今日运营数据汇总已生成静态降级模板，核心服务可继续演示。",
    sections: [
      {
        type: "visitor_flow",
        title: "客流概览",
        content: "今日客流平稳，各节点运行正常。",
      },
      {
        type: "operation",
        title: "活动情况",
        content: "今日无异常活动记录，活动预约与订单流程保持可用。",
      },
      {
        type: "infrastructure",
        title: "告警汇总",
        content: "今日无高优先级告警事件，设施状态请以实时监控为准。",
      },
    ],
    metrics: {
      totalVisitors: 0,
      totalRevenue: 0,
      totalOrders: 0,
      alertCount: 0,
      feedbackCount: 0,
      avgSatisfaction: 0,
    },
    actionItems: [
      {
        priority: "medium",
        category: "operation",
        action: "AI 日报服务恢复后重新生成正式日报。",
        status: "active",
      },
    ],
    status: "published",
    generatedAt: new Date().toISOString(),
    generatedBy: "fallback_template",
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  return jsonResponse(request, { error: "Method Not Allowed" }, { status: 405 })
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim()

  if (
    !process.env.CRON_SECRET ||
    !secret ||
    secret !== process.env.CRON_SECRET
  ) {
    return jsonResponse(
      request,
      { error: { code: "UNAUTHORIZED", message: "Cron secret is invalid." } },
      { status: 401 },
    )
  }

  const date = url.searchParams.get("date") ?? getChinaDateString()
  let autoResolved: Awaited<ReturnType<typeof runAutoResolution>> | null = null

  try {
    autoResolved = await runAutoResolution(date)
    const data = await generateDailyReport(date)
    return jsonResponse(request, { generated: true, date, autoResolved, data })
  } catch (error) {
    console.error("Cron daily report generation failed:", error)
    return jsonResponse(
      request,
      {
        generated: false,
        date,
        autoResolved,
        data: buildFallbackDailyReport(date),
        meta: {
          degraded: true,
          reason: "定时日报生成服务暂时不可用，已返回静态演示模板",
        },
      },
      { status: 200 },
    )
  }
}
