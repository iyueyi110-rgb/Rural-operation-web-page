import { NextResponse } from "next/server"

import { adoptionPlanOptions, orchardTreeOptions, type AdoptionPlan } from "@web/lib/trees-data"

interface TreeAdoptionRequest {
  treeId?: string
  plan?: AdoptionPlan
}

export async function POST(request: Request) {
  let body: TreeAdoptionRequest

  try {
    body = (await request.json()) as TreeAdoptionRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const tree = orchardTreeOptions.find((option) => option.id === body.treeId)
  const plan = adoptionPlanOptions.find((option) => option.value === body.plan)

  if (!tree || !plan) {
    return NextResponse.json({ error: "Missing or invalid adoption fields" }, { status: 400 })
  }

  if (tree.availability === "maintenance") {
    return NextResponse.json({ error: "Tree is not available for adoption" }, { status: 409 })
  }

  const createdAt = new Date().toISOString()

  return NextResponse.json({
    data: {
      id: `TA-${Date.now()}`,
      status: "pending_payment",
      createdAt,
    },
  })
}
