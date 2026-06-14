import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined
  const nodeId = searchParams.get("nodeId") ?? undefined

  const data = await prisma.device.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(nodeId ? { nodeId } : {}),
    },
    include: {
      node: true,
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
  })

  return jsonResponse(request, { data, meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid device payload" }, { status: 400 })
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const type = typeof body.type === "string" ? body.type.trim() : ""
  const status = typeof body.status === "string" && body.status.trim() ? body.status.trim() : "active"
  const nodeId = typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null
  const location = typeof body.location === "string" && body.location.trim() ? body.location.trim() : null

  if (!deviceId || !name || !type) {
    return jsonResponse(request, { error: "deviceId, name and type are required" }, { status: 400 })
  }

  const data = await prisma.device.create({
    data: { deviceId, name, type, status, nodeId, location },
    include: { node: true, readings: { orderBy: { createdAt: "desc" }, take: 1 } },
  })

  return jsonResponse(request, { data }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.deviceId !== "string") {
    return jsonResponse(request, { error: "Invalid device update" }, { status: 400 })
  }

  const data = await prisma.device.update({
    where: { deviceId: body.deviceId },
    data: {
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.type === "string" ? { type: body.type.trim() } : {}),
      ...(typeof body.status === "string" ? { status: body.status.trim() } : {}),
      ...(typeof body.nodeId === "string" ? { nodeId: body.nodeId.trim() || null } : {}),
      ...(typeof body.location === "string" ? { location: body.location.trim() || null } : {}),
    },
    include: { node: true, readings: { orderBy: { createdAt: "desc" }, take: 1 } },
  })

  return jsonResponse(request, { data })
}
