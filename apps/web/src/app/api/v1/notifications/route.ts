import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { maskPhone } from "@web/lib/tree-records"

const recipientTypes = ["villager", "tourist", "operator"] as const
const categories = ["task", "alert", "report", "tree", "activity", "system"] as const

type RecipientType = (typeof recipientTypes)[number]
type NotificationCategory = (typeof categories)[number]

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recipientType = searchParams.get("recipientType")
  const recipientId = searchParams.get("recipientId")
  const isRead = searchParams.get("isRead")
  const rawCategories = searchParams.getAll("category")

  if (recipientType && !isRecipientType(recipientType)) {
    return jsonResponse(request, { error: "Invalid recipientType" }, { status: 400 })
  }
  if (rawCategories.some((category) => !isNotificationCategory(category))) {
    return jsonResponse(request, { error: "Invalid category" }, { status: 400 })
  }
  if (isRead && isRead !== "true" && isRead !== "false") {
    return jsonResponse(request, { error: "Invalid isRead" }, { status: 400 })
  }

  const validRecipientType = isRecipientType(recipientType) ? recipientType : undefined
  const validCategories = rawCategories.filter(isNotificationCategory)
  const normalizedRecipientId =
    validRecipientType && recipientId
      ? normalizeRecipientId(validRecipientType, recipientId)
      : recipientId?.trim()
  const data = await prisma.notification.findMany({
    where: {
      ...(validRecipientType ? { recipientType: validRecipientType } : {}),
      ...(normalizedRecipientId ? { recipientId: normalizedRecipientId } : {}),
      ...(isRead ? { isRead: isRead === "true" } : {}),
      ...(validCategories.length > 0 ? { category: { in: validCategories } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return jsonResponse(request, { data: data.map(mapNotification), meta: { total: data.length } })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid notification payload" }, { status: 400 })
  }

  const recipientType = isRecipientType(body.recipientType) ? body.recipientType : null
  const recipientId =
    recipientType && typeof body.recipientId === "string"
      ? normalizeRecipientId(recipientType, body.recipientId)
      : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const content = typeof body.body === "string" ? body.body.trim() : ""
  const category = isNotificationCategory(body.category) ? body.category : null

  if (!recipientType || !recipientId || !title || !content || !category) {
    return jsonResponse(request, { error: "Missing required notification fields" }, { status: 400 })
  }

  const data = await prisma.notification.create({
    data: {
      recipientType,
      recipientId,
      title,
      body: content,
      category,
      channel: "in_app",
      refType: typeof body.refType === "string" ? body.refType.trim() || null : null,
      refId: typeof body.refId === "string" ? body.refId.trim() || null : null,
    },
  })

  return jsonResponse(request, { data: mapNotification(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid notification update" }, { status: 400 })
  }

  if (body.markAllRead === true) {
    const recipientType = isRecipientType(body.recipientType) ? body.recipientType : null
    const recipientId =
      recipientType && typeof body.recipientId === "string"
        ? normalizeRecipientId(recipientType, body.recipientId)
        : ""
    if (!recipientType || !recipientId) {
      return jsonResponse(request, { error: "recipientType and recipientId are required" }, { status: 400 })
    }

    const result = await prisma.notification.updateMany({
      where: { recipientType, recipientId, isRead: false },
      data: { isRead: true },
    })
    return jsonResponse(request, { data: { updated: result.count } })
  }

  if (typeof body.id !== "string" || body.isRead !== true) {
    return jsonResponse(request, { error: "id and isRead=true are required" }, { status: 400 })
  }

  const existing = await prisma.notification.findUnique({ where: { id: body.id.trim() } })
  if (!existing) {
    return jsonResponse(request, { error: "Notification not found" }, { status: 404 })
  }
  const data = await prisma.notification.update({
    where: { id: existing.id },
    data: { isRead: true },
  })
  return jsonResponse(request, { data: mapNotification(data) })
}

function isRecipientType(value: unknown): value is RecipientType {
  return typeof value === "string" && recipientTypes.includes(value as RecipientType)
}

function isNotificationCategory(value: unknown): value is NotificationCategory {
  return typeof value === "string" && categories.includes(value as NotificationCategory)
}

function normalizeRecipientId(recipientType: RecipientType, recipientId: string) {
  const trimmed = recipientId.trim()
  return recipientType === "tourist" ? (maskPhone(trimmed) ?? "") : trimmed
}

function mapNotification(notification: {
  id: string
  recipientType: string
  recipientId: string
  title: string
  body: string
  channel: string
  category: string
  refType: string | null
  refId: string | null
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...notification,
    refType: notification.refType ?? undefined,
    refId: notification.refId ?? undefined,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }
}
