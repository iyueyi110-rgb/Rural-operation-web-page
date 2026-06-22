import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireTouristRecipient, requireVillagerRecipient } from "@web/lib/api-auth"
import { sendSms } from "@web/lib/sms-provider"
import { isAdminRequest } from "@web/lib/tree-records"
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

  if (recipientType === "tourist" && recipientId) {
    const auth = await requireTouristRecipient(request, recipientId)
    if (!auth.authorized) return auth.response
  }

  const validRecipientType = isRecipientType(recipientType) ? recipientType : undefined
  const validCategories = rawCategories.filter(isNotificationCategory)
  const recipientIds =
    validRecipientType && recipientId
      ? await resolveRecipientIds(validRecipientType, recipientId)
      : recipientId?.trim()
        ? [recipientId.trim()]
        : []
  const data = await prisma.notification.findMany({
    where: {
      ...(validRecipientType ? { recipientType: validRecipientType } : {}),
      ...(recipientIds.length === 1
        ? { recipientId: recipientIds[0] }
        : recipientIds.length > 1
          ? { recipientId: { in: recipientIds } }
          : {}),
      ...(isRead ? { isRead: isRead === "true" } : {}),
      ...(validCategories.length > 0 ? { category: { in: validCategories } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return jsonResponse(request, { data: data.map(mapNotification), meta: { total: data.length } })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid notification payload" }, { status: 400 })
  }

  const recipientType = isRecipientType(body.recipientType) ? body.recipientType : null
  const rawRecipientId =
    recipientType && typeof body.recipientId === "string" ? body.recipientId.trim() : ""
  const recipientId =
    recipientType && rawRecipientId
      ? normalizeRecipientId(recipientType, rawRecipientId)
      : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const content = typeof body.body === "string" ? body.body.trim() : ""
  const category = isNotificationCategory(body.category) ? body.category : null
  const requestedChannel =
    body.channel === undefined || body.channel === "in_app"
      ? "in_app"
      : body.channel === "sms"
        ? "sms"
        : null

  if (!recipientType || !recipientId || !title || !content || !category || !requestedChannel) {
    return jsonResponse(request, { error: "Missing required notification fields" }, { status: 400 })
  }

  let deliveryChannel = "in_app"
  if (requestedChannel === "sms") {
    const phone = await resolveSmsPhone(recipientType, rawRecipientId)
    const sent = phone ? await sendSms(phone, `${title}\n${content}`) : false
    deliveryChannel = sent ? "sms" : "in_app"
  }

  const data = await prisma.notification.create({
    data: {
      recipientType,
      recipientId,
      title,
      body: content,
      category,
      channel: deliveryChannel,
      refType: typeof body.refType === "string" ? body.refType.trim() || null : null,
      refId: typeof body.refId === "string" ? body.refId.trim() || null : null,
    },
  })

  return jsonResponse(request, { data: mapNotification(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const isAdmin = isAdminRequest(request)

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid notification update" }, { status: 400 })
  }

  if (body.markAllRead === true) {
    const recipientType = isRecipientType(body.recipientType) ? body.recipientType : null
    const rawRecipientId =
      recipientType && typeof body.recipientId === "string"
        ? body.recipientId
        : ""
    if (!recipientType || !rawRecipientId) {
      return jsonResponse(request, { error: "recipientType and recipientId are required" }, { status: 400 })
    }

    if (!isAdmin) {
      const auth =
        recipientType === "tourist"
          ? await requireTouristRecipient(request, rawRecipientId)
          : recipientType === "villager"
            ? requireVillagerRecipient(request, rawRecipientId)
            : { authorized: false as const, response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }) }
      if (!auth.authorized) return auth.response
    }

    const recipientIds = await resolveRecipientIds(recipientType, rawRecipientId)

    const result = await prisma.notification.updateMany({
      where: { recipientType, recipientId: { in: recipientIds }, isRead: false },
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
  if (!isAdmin) {
    const auth =
      existing.recipientType === "tourist"
        ? await requireTouristRecipient(request, existing.recipientId)
        : existing.recipientType === "villager"
          ? requireVillagerRecipient(request, existing.recipientId)
          : { authorized: false as const, response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }) }
    if (!auth.authorized) return auth.response
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

async function resolveRecipientIds(recipientType: RecipientType, recipientId: string) {
  const normalized = normalizeRecipientId(recipientType, recipientId)
  if (recipientType !== "tourist" || /^1[3-9]\d{9}$/.test(recipientId.trim())) {
    return normalized ? [normalized] : []
  }

  const user = await prisma.user.findUnique({
    where: { id: recipientId.trim() },
    select: { mobile: true },
  })
  const maskedMobile = maskPhone(user?.mobile)
  return Array.from(new Set([normalized, maskedMobile].filter((value): value is string => Boolean(value))))
}

async function resolveSmsPhone(recipientType: RecipientType, recipientId: string) {
  if (/^1[3-9]\d{9}$/.test(recipientId)) return recipientId
  if (recipientType !== "villager") return null

  const villager = await prisma.villager.findUnique({
    where: { id: recipientId },
    select: { phone: true },
  })
  return villager?.phone && /^1[3-9]\d{9}$/.test(villager.phone) ? villager.phone : null
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
