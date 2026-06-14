import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get("includeInactive") === "true"
  const category = searchParams.get("category") ?? undefined

  const data = await prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { status: "active" }),
      ...(category ? { category } : {}),
    },
    include: { node: true },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  })

  return jsonResponse(request, { data, meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid product payload" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const price = body.price === null || body.price === "" || body.price === undefined ? null : Number(body.price)

  if (!name || !category || !description || (price !== null && (!Number.isFinite(price) || price < 0))) {
    return jsonResponse(request, { error: "Product payload is invalid" }, { status: 400 })
  }

  const data = await prisma.product.create({
    data: {
      name,
      category,
      description,
      price,
      unit: typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : null,
      stockStatus: typeof body.stockStatus === "string" && body.stockStatus.trim() ? body.stockStatus.trim() : "available",
      nodeId: typeof body.nodeId === "string" && body.nodeId.trim() ? body.nodeId.trim() : null,
      imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
      status: typeof body.status === "string" && body.status.trim() ? body.status.trim() : "active",
    },
    include: { node: true },
  })

  return jsonResponse(request, { data }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid product update" }, { status: 400 })
  }

  const data = await prisma.product.update({
    where: { id: body.id },
    data: {
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.category === "string" ? { category: body.category.trim() } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
      ...(body.price === null || body.price === "" ? { price: null } : typeof body.price === "number" ? { price: body.price } : {}),
      ...(typeof body.unit === "string" ? { unit: body.unit.trim() || null } : {}),
      ...(typeof body.stockStatus === "string" ? { stockStatus: body.stockStatus.trim() } : {}),
      ...(typeof body.nodeId === "string" ? { nodeId: body.nodeId.trim() || null } : {}),
      ...(typeof body.imageUrl === "string" ? { imageUrl: body.imageUrl.trim() || null } : {}),
      ...(typeof body.status === "string" ? { status: body.status.trim() } : {}),
    },
    include: { node: true },
  })

  return jsonResponse(request, { data })
}
