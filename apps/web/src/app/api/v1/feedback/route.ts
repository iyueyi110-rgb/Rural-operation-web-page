import { NextResponse } from "next/server"

import type { Feedback, FeedbackRecord } from "@zouma/contracts"
import { prisma } from "@zouma/database"
import { ModelProviderAdapter } from "@zouma/utils"

import { isPlainObject } from "@web/lib/aigc-api"
import { extractJsonContent } from "@web/lib/ai-json"
import {
  isFeedbackCategory,
  isFeedbackSeverity,
  isFeedbackStatus,
  sanitizeContent,
} from "@web/lib/feedback-store"
import { getAllowedCorsOrigins } from "@web/lib/site-url"

const feedbackInclude = {
  handlingRecords: {
    orderBy: {
      createdAt: "desc",
    },
  },
} as const

interface FeedbackTicketWithRecords {
  id: string
  category: string
  severity: string
  content: string
  rating: number
  status: string
  source: string
  createdAt: Date
  updatedAt: Date
  handlingRecords: Array<{
    id: string
    status: string
    note: string
    operator: string
    createdAt: Date
  }>
}

function getCorsHeaders(request: Request) {
  const allowedOrigins = getAllowedCorsOrigins()
  const requestOrigin = request.headers.get("origin")
  const allowedOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  }
}

function jsonResponse(request: Request, body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(request),
      ...init?.headers,
    },
  })
}

function createId(prefix: "FB" | "HR") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function toFeedbackRecord(ticket: FeedbackTicketWithRecords): FeedbackRecord {
  return {
    id: ticket.id,
    category: ticket.category as Feedback["category"],
    severity: ticket.severity as Feedback["severity"],
    content: ticket.content,
    rating: ticket.rating,
    status: ticket.status as Feedback["status"],
    source: ticket.source as FeedbackRecord["source"],
    submittedAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    handlingRecords: ticket.handlingRecords.map((record) => ({
      id: record.id,
      status: record.status as Feedback["status"],
      note: record.note,
      operator: record.operator,
      createdAt: record.createdAt.toISOString(),
    })),
  }
}

function normalizeAiSuggestion(value: unknown) {
  if (!isPlainObject(value)) return null
  const category = typeof value.category === "string" ? value.category : ""
  const severity = typeof value.severity === "string" ? value.severity : ""
  const urgencyReason = typeof value.urgencyReason === "string" ? value.urgencyReason : ""

  if (!category || !severity || !urgencyReason) return null
  return { category, severity, urgencyReason }
}

async function suggestFeedbackMeta(content: string) {
  try {
    const result = await ModelProviderAdapter.complete(
      `分析以下游客反馈，返回 JSON：{"category":"内容讲解|服务接待|设施导视|支付订单|其他问题","severity":"low|medium|high|urgent","urgencyReason":"一句话理由"}\n反馈内容：${content}`,
      {
        systemPrompt: "你是走马村游客反馈分析助手。只返回 JSON，不要输出解释文字。",
        temperature: 0.2,
      },
    )
    return normalizeAiSuggestion(extractJsonContent(result.content))
  } catch (error) {
    console.error("Feedback AI suggestion failed:", error)
    return null
  }
}

export function OPTIONS(request: Request) {
  const allowedOrigins = getAllowedCorsOrigins()
  const requestOrigin = request.headers.get("origin")

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return new Response(null, { status: 403, headers: getCorsHeaders(request) })
  }

  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

export async function GET(request: Request) {
  const records = await prisma.feedbackTicket.findMany({
    include: feedbackInclude,
    orderBy: { createdAt: "desc" },
  })
  const data = records.map(toFeedbackRecord)

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      page: 1,
      pageSize: data.length,
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || !isFeedbackCategory(body.category) || !isFeedbackSeverity(body.severity)) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_FEEDBACK", message: "Feedback category or severity is invalid." } },
      { status: 400 },
    )
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  const rating = Number(body.rating)

  if (
    content.length < 8 ||
    content.length > 500 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_FEEDBACK_CONTENT", message: "Feedback content or rating is invalid." } },
      { status: 400 },
    )
  }

  const now = new Date()
  const handlingRecordId = createId("HR")
  const sanitizedContent = sanitizeContent(content)
  const data = await prisma.feedbackTicket.create({
    data: {
      id: createId("FB"),
      category: body.category,
      severity: body.severity,
      content: sanitizedContent,
      rating,
      status: "submitted",
      source: "web",
      createdAt: now,
      updatedAt: now,
      handlingRecords: {
        create: {
          id: handlingRecordId,
          status: "submitted",
          note: "前台反馈已入库。",
          operator: "系统",
          createdAt: now,
        },
      },
    },
    include: feedbackInclude,
  })

  suggestFeedbackMeta(sanitizedContent)
    .then(async (suggestion) => {
      if (!suggestion) return
      await prisma.feedbackHandlingRecord.update({
        where: { id: handlingRecordId },
        data: {
          note: `前台反馈已入库。AI 建议：${suggestion.category}/${suggestion.severity} - ${suggestion.urgencyReason}`,
        },
      })
    })
    .catch((error) => console.error("Feedback AI suggestion update failed:", error))

  return jsonResponse(request, { data: toFeedbackRecord(data) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.id !== "string" || !isFeedbackStatus(body.status)) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_STATUS_UPDATE", message: "Feedback id or status is invalid." } },
      { status: 400 },
    )
  }

  const noteInput = typeof body.note === "string" ? body.note : ""
  const note = sanitizeContent(noteInput || "后台更新了工单状态。")

  try {
    const data = await prisma.feedbackTicket.update({
      where: { id: body.id },
      data: {
        status: body.status,
        assignee: "运营后台",
        handlingRecords: {
          create: {
            id: createId("HR"),
            status: body.status,
            note,
            operator: "运营后台",
          },
        },
      },
      include: feedbackInclude,
    })

    return jsonResponse(request, { data: toFeedbackRecord(data) })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return jsonResponse(
        request,
        { error: { code: "FEEDBACK_NOT_FOUND", message: "Feedback ticket was not found." } },
        { status: 404 },
      )
    }

    throw error
  }
}
