import { prisma } from "@zouma/database"

import { getChinaDateString, getChinaDayRange, isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { runAlertChecks, toAlertData } from "@web/lib/alert-engine"
import { isAdminRequest } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? getChinaDateString()
  const type = searchParams.get("type") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const shouldRun = searchParams.get("run") === "true"
  const { start, end } = getChinaDayRange(date)

  try {
    if (shouldRun) {
      await runAlertChecks(date)
    }

    const data = await prisma.alert.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(type ? { alertType: type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    return jsonResponse(request, { data: data.map(toAlertData), meta: { total: data.length } })
  } catch (error) {
    console.error("Alerts query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "数据库暂不可用，已返回降级演示数据" },
    })
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string" || typeof body.status !== "string") {
    return jsonResponse(request, { error: "Invalid alert update" }, { status: 400 })
  }

  const current = await prisma.alert.findUnique({ where: { id: body.id } })
  if (!current) return jsonResponse(request, { error: "Alert not found" }, { status: 404 })

  const allowed: Record<string, string[]> = {
    active: ["acknowledged"],
    acknowledged: ["resolved"],
    resolved: [],
  }

  if (!allowed[current.status]?.includes(body.status)) {
    return jsonResponse(request, { error: "Invalid alert status transition" }, { status: 400 })
  }

  const updated = await prisma.alert.update({
    where: { id: body.id },
    data: {
      status: body.status,
      resolvedAt: body.status === "resolved" ? new Date() : current.resolvedAt,
    },
  })

  return jsonResponse(request, { data: toAlertData(updated) })
}
