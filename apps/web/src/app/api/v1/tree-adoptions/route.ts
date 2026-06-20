import { prisma } from "@zouma/database"

import { adoptionPlanOptions, orchardTreeOptions, type AdoptionPlan } from "@web/lib/trees-data"
import { getBearerToken, verifyJWT } from "@web/lib/auth-jwt"
import {
  acquireAdoptionLock,
  isRedisUnavailableError,
  releaseAdoptionLock,
} from "@web/lib/adoption-lock"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateInteractionTasks } from "@web/lib/interaction-generator"
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

  const authToken = getBearerToken(request)
  const authSession = authToken ? await verifyJWT(authToken) : null
  const authenticatedUser = authSession
    ? await prisma.user.findUnique({
        where: { id: authSession.userId },
        select: { id: true, jwtSalt: true, mobile: true },
      })
    : null
  const validAuthenticatedUser =
    authenticatedUser && authenticatedUser.jwtSalt === authSession?.salt
      ? authenticatedUser
      : null
  const adopterId = validAuthenticatedUser?.id ?? null
  const adopterPhone = maskPhone(
    validAuthenticatedUser
      ? validAuthenticatedUser.mobile
      : typeof body.adopterPhone === "string"
        ? body.adopterPhone
        : undefined,
  )

  let lockToken: string | null = null
  try {
    lockToken = await acquireAdoptionLock(
      dbTree.id,
      typeof body.adopterPhone === "string" ? body.adopterPhone.trim() : "anonymous",
    )
    if (!lockToken) {
      return jsonResponse(
        request,
        { error: "Tree is currently being reserved, please try again." },
        { status: 409 },
      )
    }
  } catch (error) {
    if (!isRedisUnavailableError(error)) throw error
    console.warn("Redis unavailable, continuing with database optimistic lock")
  }

  let record
  try {
    record = await prisma.$transaction(async (tx) => {
      const currentTree = await tx.orchardTree.findUnique({
        where: { id: dbTree.id },
        select: { adoptStatus: true, version: true },
      })
      if (!currentTree || currentTree.adoptStatus !== "available") {
        throw new AdoptionConflictError()
      }

      const updated = await tx.orchardTree.updateMany({
        where: {
          id: dbTree.id,
          version: currentTree.version,
          adoptStatus: "available",
        },
        data: { adoptStatus: "reserved", version: { increment: 1 } },
      })
      if (updated.count !== 1) throw new AdoptionConflictError()

      return tx.treeAdoption.create({
        data: {
          treeId: dbTree.id,
          plan: plan.value,
          adopterName:
            typeof body.adopterName === "string" ? body.adopterName.trim() : null,
          adopterPhone,
          adopterId,
          status: "pending_payment",
        },
      })
    })
  } catch (error) {
    if (error instanceof AdoptionConflictError) {
      return jsonResponse(request, { error: "Tree is no longer available" }, { status: 409 })
    }
    throw error
  } finally {
    if (lockToken) {
      await releaseAdoptionLock(dbTree.id, lockToken).catch((error) =>
        console.error("Failed to release adoption lock:", error),
      )
    }
  }

  return jsonResponse(request, {
    data: {
      id: record.id,
      treeId: record.treeId,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    },
  })
}

class AdoptionConflictError extends Error {}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid update" }, { status: 400 })
  }

  const existing = await prisma.treeAdoption.findUnique({ where: { id: body.id.trim() } })
  if (!existing) {
    return jsonResponse(request, { error: "Adoption not found" }, { status: 404 })
  }

  const validStatuses = ["pending_payment", "active", "completed", "cancelled"]
  const nextStatus =
    typeof body.status === "string" && validStatuses.includes(body.status)
      ? body.status
      : existing.status
  const data = await prisma.treeAdoption.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      ...(typeof body.adopterName === "string"
        ? { adopterName: body.adopterName.trim() || null }
        : {}),
      ...(typeof body.adopterPhone === "string"
        ? { adopterPhone: maskPhone(body.adopterPhone.trim()) ?? null }
        : {}),
    },
  })

  if (existing.status !== "active" && nextStatus === "active") {
    void (async () => {
      await generateInteractionTasks(data.id, data.treeId)
      if (!data.adopterPhone) return

      const tree = await prisma.orchardTree.findUnique({
        where: { id: data.treeId },
        select: { treeCode: true },
      })
      await prisma.notification.create({
        data: {
          recipientType: "tourist",
          recipientId: data.adopterPhone,
          title: "🎉 你的果树认养已激活",
          body: "现在可以开始浇水、施肥、拍照等互动任务。打开果树页面查看你的专属任务。",
          category: "tree",
          refType: "tree_adoption",
          refId: tree?.treeCode ?? data.treeId,
        },
      })
    })().catch((error) =>
      console.error("Failed to complete adoption activation workflow:", error),
    )
  }

  return jsonResponse(request, {
    data: { id: data.id, status: data.status, updatedAt: data.updatedAt.toISOString() },
  })
}
