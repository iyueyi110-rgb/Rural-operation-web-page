import { prisma } from "@zouma/database"

import {
  adoptionPlanOptions,
  orchardTreeOptions,
  type AdoptionPlan,
} from "@web/lib/trees-data"
import { getBearerToken, verifyJWT } from "@web/lib/auth-jwt"
import {
  acquireAdoptionLock,
  isRedisUnavailableError,
  releaseAdoptionLock,
} from "@web/lib/adoption-lock"
import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { generateInteractionTasks } from "@web/lib/interaction-generator"
import {
  isAdminRequest,
  listTreeAdoptions,
  maskPhone,
} from "@web/lib/tree-records"
import {
  isAdoptionAction,
  transitionAdoption,
} from "@web/lib/adoption-workflow"
import { isFeatureEnabled } from "@web/lib/feature-flags"
import { WorkflowConflictError } from "@web/lib/workflow-errors"

interface TreeAdoptionRequest {
  treeId?: string
  plan?: AdoptionPlan
  adopterName?: string
  adopterPhone?: string
}

const adoptableTreeStatuses = ["available", "limited"]

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  try {
    const records = await listTreeAdoptions(
      searchParams.get("adopterPhone") ?? undefined,
    )
    return jsonResponse(request, {
      data: records,
      meta: { total: records.length },
    })
  } catch (error) {
    console.error("Tree adoption query failed:", error)
    return jsonResponse(request, {
      data: [],
      meta: {
        degraded: true,
        total: 0,
        reason: "数据库暂不可用，认养记录暂无演示数据",
      },
    })
  }
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as TreeAdoptionRequest | null

  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const treeId = typeof body.treeId === "string" ? body.treeId : ""
  const requestedPlan = typeof body.plan === "string" ? body.plan : ""
  const tree = orchardTreeOptions.find((option) => option.id === treeId)
  const plan = adoptionPlanOptions.find(
    (option) => option.value === requestedPlan,
  )

  if (!tree || !plan) {
    return jsonResponse(
      request,
      { error: "Missing or invalid adoption fields" },
      { status: 400 },
    )
  }

  const dbTree = await prisma.orchardTree.findFirst({
    where: {
      OR: [{ treeCode: tree.id }, { treeCode: tree.treeCode }, { id: tree.id }],
    },
  })

  if (!dbTree) {
    return jsonResponse(
      request,
      { error: "Tree is not available in database" },
      { status: 404 },
    )
  }

  if (!adoptableTreeStatuses.includes(dbTree.adoptStatus)) {
    return jsonResponse(
      request,
      { error: "Tree is not available for adoption" },
      { status: 409 },
    )
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
      typeof body.adopterPhone === "string"
        ? body.adopterPhone.trim()
        : "anonymous",
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
      if (
        !currentTree ||
        !adoptableTreeStatuses.includes(currentTree.adoptStatus)
      ) {
        throw new AdoptionConflictError()
      }

      const updated = await tx.orchardTree.updateMany({
        where: {
          id: dbTree.id,
          version: currentTree.version,
          adoptStatus: { in: adoptableTreeStatuses },
        },
        data: { adoptStatus: "reserved", version: { increment: 1 } },
      })
      if (updated.count !== 1) throw new AdoptionConflictError()

      return tx.treeAdoption.create({
        data: {
          adoptionCode: `ADOPT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          treeId: dbTree.id,
          plan: plan.value,
          adopterName:
            typeof body.adopterName === "string"
              ? body.adopterName.trim()
              : null,
          adopterPhone,
          adopterId,
          status: "pending_payment",
        },
      })
    })
  } catch (error) {
    if (error instanceof AdoptionConflictError) {
      return jsonResponse(
        request,
        { error: "Tree is no longer available" },
        { status: 409 },
      )
    }
    throw error
  } finally {
    if (lockToken) {
      await releaseAdoptionLock(dbTree.id, lockToken).catch((error) =>
        console.error("Failed to release adoption lock:", error),
      )
    }
  }

  return jsonResponse(
    request,
    {
      data: {
        id: record.id,
        treeId: record.treeId,
        status: record.status,
        orderType: "tree_adoption",
        amount: plan.value === "annual" ? 680 : 360,
        createdAt: record.createdAt.toISOString(),
      },
    },
    { status: 201 },
  )
}

class AdoptionConflictError extends Error {}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.id !== "string") {
    return jsonResponse(request, { error: "Invalid update" }, { status: 400 })
  }

  const existing = await prisma.treeAdoption.findUnique({
    where: { id: body.id.trim() },
  })
  if (!existing) {
    return jsonResponse(
      request,
      { error: "Adoption not found" },
      { status: 404 },
    )
  }

  let data
  if (isFeatureEnabled("ADOPTION_V2_ENABLED")) {
    if (
      !isAdoptionAction(body.action) ||
      !Number.isInteger(body.expectedVersion)
    ) {
      return jsonResponse(
        request,
        { error: "action and expectedVersion are required" },
        { status: 400 },
      )
    }
    try {
      data = await transitionAdoption({
        adoptionId: existing.id,
        action: body.action,
        expectedVersion: body.expectedVersion as number,
        actorId: request.headers.get("x-admin-user")?.trim() || "admin",
        actorType: "operator",
        reason:
          typeof body.reason === "string" ? body.reason.trim() : undefined,
        correlationId: request.headers.get("x-correlation-id") ?? undefined,
      })
    } catch (error) {
      if (error instanceof WorkflowConflictError) {
        return jsonResponse(
          request,
          { error: error.message, code: error.code },
          { status: 409 },
        )
      }
      throw error
    }
  } else {
    const validStatuses = [
      "pending_payment",
      "active",
      "completed",
      "cancelled",
    ]
    const nextStatus =
      typeof body.status === "string" && validStatuses.includes(body.status)
        ? body.status
        : existing.status
    data = await prisma.treeAdoption.update({
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
  }

  if (existing.status !== "active" && data.status === "active") {
    void (async () => {
      await generateInteractionTasks(data.id, data.treeId)
      await prisma.task.upsert({
        where: { id: `${data.id}-care-001` },
        create: {
          id: `${data.id}-care-001`,
          title: "首月荔枝树养护",
          description:
            "完成树体巡查、基础养护，并提交可识别养护对象与结果的照片。",
          taskType: "farming",
          status: "pending",
          adoptionId: data.id,
          treeId: data.treeId,
          deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
          evidenceRequirements: {
            minImages: 2,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          },
        },
        update: {},
      })
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
    data: {
      id: data.id,
      status: data.status,
      updatedAt: data.updatedAt.toISOString(),
    },
  })
}
