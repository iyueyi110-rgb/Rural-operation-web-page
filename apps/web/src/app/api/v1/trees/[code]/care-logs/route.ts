import { prisma } from "@zouma/database"
import type { TreeCareLogType } from "@zouma/contracts"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

const logTypes: TreeCareLogType[] = ["watering", "pruning", "fertilizing", "pest_control", "photo", "harvest"]

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(
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

  const logType = body.logType
  const content = body.content

  if (typeof logType !== "string" || !logTypes.includes(logType as TreeCareLogType)) {
    return jsonResponse(request, { error: "Invalid log type" }, { status: 400 })
  }

  if (typeof content !== "string" || content.trim().length < 2) {
    return jsonResponse(request, { error: "Care log content is required" }, { status: 400 })
  }

  const record = await prisma.treeCareLog.create({
    data: {
      treeId: tree.id,
      logType,
      content: content.trim(),
      imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
      operator: typeof body.operator === "string" && body.operator.trim() ? body.operator.trim() : "运营后台",
    },
  })

  return jsonResponse(
    request,
    {
      data: {
        id: record.id,
        treeId: record.treeId,
        logType: record.logType,
        content: record.content,
        imageUrl: record.imageUrl,
        operator: record.operator,
        createdAt: record.createdAt.toISOString(),
      },
    },
    { status: 201 },
  )
}
