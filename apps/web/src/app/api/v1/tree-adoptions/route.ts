import { prisma } from "@zouma/database"

import { adoptionPlanOptions, orchardTreeOptions, type AdoptionPlan } from "@web/lib/trees-data"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { listTreeAdoptions, maskPhone } from "@web/lib/tree-records"

interface TreeAdoptionRequest {
  treeId?: string
  plan?: AdoptionPlan
  adopterName?: string
  adopterPhone?: string
}

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const records = await listTreeAdoptions(searchParams.get("adopterPhone") ?? undefined)
  return jsonResponse(request, { data: records, meta: { total: records.length } })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TreeAdoptionRequest | null

  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 })
  }

  const treeId = typeof body.treeId === "string" ? body.treeId : ""
  const requestedPlan = typeof body.plan === "string" ? body.plan : ""
  const tree = orchardTreeOptions.find((option) => option.id === treeId)
  const plan = adoptionPlanOptions.find((option) => option.value === requestedPlan)

  if (!tree || !plan) {
    return jsonResponse(request, { error: "Missing or invalid adoption fields" }, { status: 400 })
  }

  const dbTree = await prisma.orchardTree.findFirst({
    where: { OR: [{ treeCode: tree.id }, { treeCode: tree.treeCode }, { id: tree.id }] },
  })

  if (!dbTree) {
    return jsonResponse(request, { error: "Tree is not available in database" }, { status: 404 })
  }

  if (dbTree.adoptStatus === "maintenance") {
    return jsonResponse(request, { error: "Tree is not available for adoption" }, { status: 409 })
  }

  const record = await prisma.treeAdoption.create({
    data: {
      treeId: dbTree.id,
      plan: plan.value,
      adopterName: typeof body.adopterName === "string" ? body.adopterName.trim() : null,
      adopterPhone: maskPhone(typeof body.adopterPhone === "string" ? body.adopterPhone : undefined),
      status: "pending_payment",
    },
  })

  return jsonResponse(request, {
    data: {
      id: record.id,
      treeId: record.treeId,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    },
  })
}
