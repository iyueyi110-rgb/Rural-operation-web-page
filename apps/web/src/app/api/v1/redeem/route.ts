import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { redeemAdoptionPoints, RedemptionError } from "@web/lib/points-service"
import { maskPhone } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const adoptionId = searchParams.get("adoptionId")?.trim() ?? ""
  const adopterPhone = searchParams.get("adopterPhone")?.trim() ?? ""

  const adoption = await findOwnedActiveAdoption(adoptionId, adopterPhone)
  if (!adoption) {
    return jsonResponse(
      request,
      { error: "Active adoption not found" },
      { status: 404 },
    )
  }

  const records = await prisma.redemptionRecord.findMany({
    where: { adoptionId: adoption.id },
    include: { option: true },
    orderBy: { createdAt: "desc" },
  })

  return jsonResponse(request, {
    data: records.map(mapRedemptionRecord),
    meta: { total: records.length },
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid redemption payload" },
      { status: 400 },
    )
  }

  const adoptionId =
    typeof body.adoptionId === "string" ? body.adoptionId.trim() : ""
  const adopterPhone =
    typeof body.adopterPhone === "string" ? body.adopterPhone.trim() : ""
  const optionId = typeof body.optionId === "string" ? body.optionId.trim() : ""
  const adoption = await findOwnedActiveAdoption(adoptionId, adopterPhone)

  if (!adoption || !optionId) {
    return jsonResponse(
      request,
      { error: "Invalid redemption request" },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.$transaction((tx) =>
      redeemAdoptionPoints({ adoptionId: adoption.id, optionId, client: tx }),
    )
    return jsonResponse(
      request,
      {
        data: {
          account: {
            adoptionId: adoption.id,
            totalPoints: result.account.totalPoints,
            availablePoints: result.account.availablePoints,
            redeemedPoints: result.account.redeemedPoints,
          },
          record: mapRedemptionRecord(result.record),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof RedemptionError) {
      return jsonResponse(
        request,
        { error: error.code },
        { status: error.code === "INSUFFICIENT_POINTS" ? 409 : 404 },
      )
    }
    throw error
  }
}

function findOwnedActiveAdoption(adoptionId: string, adopterPhone: string) {
  if (!adoptionId || !adopterPhone) return null
  return prisma.treeAdoption.findFirst({
    where: {
      id: adoptionId,
      adopterPhone: maskPhone(adopterPhone),
      status: "active",
    },
    select: { id: true },
  })
}

function mapRedemptionRecord(record: {
  id: string
  adoptionId: string
  optionId: string
  pointsSpent: number
  status: string
  note: string | null
  createdAt: Date
  fulfilledAt: Date | null
  option?: {
    id: string
    title: string
    description: string | null
    pointsCost: number
    type: string
    stock: number
    redeemedCount: number
    imageUrl: string | null
    status: string
  }
}) {
  return {
    id: record.id,
    adoptionId: record.adoptionId,
    optionId: record.optionId,
    pointsSpent: record.pointsSpent,
    status: record.status,
    note: record.note ?? undefined,
    createdAt: record.createdAt.toISOString(),
    fulfilledAt: record.fulfilledAt?.toISOString(),
    option: record.option
      ? {
          id: record.option.id,
          title: record.option.title,
          description: record.option.description ?? undefined,
          pointsCost: record.option.pointsCost,
          type: record.option.type,
          stock: record.option.stock,
          redeemedCount: record.option.redeemedCount,
          imageUrl: record.option.imageUrl ?? undefined,
          status: record.option.status,
        }
      : undefined,
  }
}
