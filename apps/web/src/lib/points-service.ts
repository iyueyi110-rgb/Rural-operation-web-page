import type { Prisma } from "@zouma/database"
import { prisma } from "@zouma/database"

type PrismaClientLike = Prisma.TransactionClient | typeof prisma

export async function getOrCreateAdoptionPoints(
  adoptionId: string,
  client: PrismaClientLike = prisma,
) {
  return client.adoptionPoints.upsert({
    where: { adoptionId },
    create: { adoptionId },
    update: {},
  })
}

export async function awardAdoptionPoints({
  adoptionId,
  amount,
  source,
  referenceId,
  note,
  client = prisma,
}: {
  adoptionId: string
  amount: number
  source: string
  referenceId?: string
  note?: string
  client?: PrismaClientLike
}) {
  if (amount <= 0) return getOrCreateAdoptionPoints(adoptionId, client)

  const account = await client.adoptionPoints.upsert({
    where: { adoptionId },
    create: {
      adoptionId,
      totalPoints: amount,
      availablePoints: amount,
    },
    update: {
      totalPoints: { increment: amount },
      availablePoints: { increment: amount },
    },
  })

  await client.pointsTransaction.create({
    data: {
      adoptionPointsId: account.id,
      amount,
      type: "earn",
      source,
      referenceId,
      note,
    },
  })

  return account
}

export async function redeemAdoptionPoints({
  adoptionId,
  optionId,
  client = prisma,
}: {
  adoptionId: string
  optionId: string
  client?: PrismaClientLike
}) {
  const option = await client.redemptionOption.findFirst({
    where: { id: optionId, status: "active" },
  })
  if (!option) throw new RedemptionError("OPTION_NOT_FOUND")
  if (option.stock >= 0 && option.redeemedCount >= option.stock) {
    throw new RedemptionError("OUT_OF_STOCK")
  }

  const account = await getOrCreateAdoptionPoints(adoptionId, client)
  if (account.availablePoints < option.pointsCost) {
    throw new RedemptionError("INSUFFICIENT_POINTS")
  }

  const updatedAccount = await client.adoptionPoints.update({
    where: { id: account.id },
    data: {
      availablePoints: { decrement: option.pointsCost },
      redeemedPoints: { increment: option.pointsCost },
    },
  })
  const record = await client.redemptionRecord.create({
    data: {
      adoptionId,
      optionId,
      pointsSpent: option.pointsCost,
      status: "pending",
    },
    include: { option: true },
  })
  await client.redemptionOption.update({
    where: { id: option.id },
    data: { redeemedCount: { increment: 1 } },
  })
  await client.pointsTransaction.create({
    data: {
      adoptionPointsId: account.id,
      amount: -option.pointsCost,
      type: "redeem",
      source: "redeem",
      referenceId: record.id,
      note: option.title,
    },
  })

  return { account: updatedAccount, record }
}

export class RedemptionError extends Error {
  constructor(
    public readonly code:
      | "OPTION_NOT_FOUND"
      | "OUT_OF_STOCK"
      | "INSUFFICIENT_POINTS",
  ) {
    super(code)
  }
}
