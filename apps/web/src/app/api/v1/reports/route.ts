import { prisma } from "@zouma/database"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { isAdminRequest } from "@web/lib/tree-records"

import { getChinaDateString, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
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
  try {
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
  } catch (error) {
    console.error("Daily report query failed:", error)
    return jsonResponse(request, {
      data: [buildFallbackDailyReport(getChinaDateString())],
      meta: {
        degraded: true,
        total: 1,
        reason: "数据库暂不可用，已返回降级演示数据",
      },
    })
  }
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
        data: buildFallbackDailyReport(date),
        meta: {
          degraded: true,
          reason: "日报生成服务暂时不可用，已返回静态演示模板",
        },
      },
      { status: 200 },
    )
  }
}
