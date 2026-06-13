import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { mapControlCommand } from "@web/lib/infrastructure-control"
import { isAdminRequest } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined
  const data = await prisma.controlCommand.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return jsonResponse(request, { data: data.map(mapControlCommand), meta: { total: data.length } })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string" || typeof body.status !== "string") {
    return jsonResponse(request, { error: "Invalid command update" }, { status: 400 })
  }

  const current = await prisma.controlCommand.findUnique({ where: { id: body.id } })
  if (!current) {
    return jsonResponse(request, { error: "Command not found" }, { status: 404 })
  }

  const allowed: Record<string, string[]> = {
    pending: ["approved", "rejected"],
    approved: ["executed", "rejected"],
    executed: [],
    rejected: [],
  }

  if (!allowed[current.status]?.includes(body.status)) {
    return jsonResponse(request, { error: "Invalid status transition" }, { status: 400 })
  }

  const updated = await prisma.controlCommand.update({
    where: { id: body.id },
    data: { status: body.status },
  })

  return jsonResponse(request, { data: mapControlCommand(updated) })
}
