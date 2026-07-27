import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getTreeProfile, isAdminRequest } from "@web/lib/tree-records"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(
  request: Request,
  context: { params: { code: string } | Promise<{ code: string }> },
) {
  const { code } = await context.params
  try {
    const tree = await getTreeProfile(code)

    if (!tree) {
      return jsonResponse(request, { error: "Tree not found" }, { status: 404 })
    }

    return jsonResponse(request, { data: tree })
  } catch (error) {
    console.error("Tree profile query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: { degraded: true, total: 0, reason: "数据库暂不可用，已返回降级演示数据" },
    })
  }
}

export async function PATCH(
  request: Request,
  context: { params: { code: string } | Promise<{ code: string }> },
) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const { code } = await context.params
  const body = (await request.json().catch(() => null)) as unknown

  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const tree = await prisma.orchardTree.findFirst({
    where: { OR: [{ treeCode: code }, { id: code }] },
  })

  if (!tree) {
    return jsonResponse(request, { error: "Tree not found" }, { status: 404 })
  }

  const growthPhotos = Array.isArray(body.growthPhotos)
    ? body.growthPhotos.filter((item): item is string => typeof item === "string")
    : undefined

  const updated = await prisma.orchardTree.update({
    where: { id: tree.id },
    data: {
      fireMemory: typeof body.fireMemory === "string" ? body.fireMemory : tree.fireMemory,
      newShootsRecord:
        typeof body.newShootsRecord === "string" ? body.newShootsRecord : tree.newShootsRecord,
      growthPhotos: growthPhotos ?? undefined,
      adoptStatus: typeof body.adoptStatus === "string" ? body.adoptStatus : tree.adoptStatus,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: request.headers.get("x-admin-token") ? "admin-token" : "admin",
      action: "tree_update",
      targetType: "orchard_tree",
      targetId: updated.id,
      detail: {
        treeCode: updated.treeCode,
        fields: Object.keys(body),
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
    },
  })

  return jsonResponse(request, { data: { id: updated.id, treeCode: updated.treeCode } })
}
