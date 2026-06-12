import { NextResponse } from "next/server"

import {
  createFeedbackRecord,
  isFeedbackCategory,
  isFeedbackSeverity,
  isFeedbackStatus,
  listFeedbackRecords,
  updateFeedbackStatus,
} from "@web/lib/feedback-store"
import { getAllowedCorsOrigins } from "@web/lib/site-url"

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

export function OPTIONS(request: Request) {
  const allowedOrigins = getAllowedCorsOrigins()
  const requestOrigin = request.headers.get("origin")

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return new Response(null, { status: 403, headers: getCorsHeaders(request) })
  }

  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

export function GET(request: Request) {
  const data = listFeedbackRecords()

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
    return jsonResponse(request, { error: { code: "INVALID_FEEDBACK", message: "Feedback category or severity is invalid." } }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  const rating = Number(body.rating)

  if (content.length < 8 || content.length > 500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse(request, { error: { code: "INVALID_FEEDBACK_CONTENT", message: "Feedback content or rating is invalid." } }, { status: 400 })
  }

  const data = createFeedbackRecord({
    category: body.category,
    severity: body.severity,
    content,
    rating,
  })

  return jsonResponse(request, { data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.id !== "string" || !isFeedbackStatus(body.status)) {
    return jsonResponse(request, { error: { code: "INVALID_STATUS_UPDATE", message: "Feedback id or status is invalid." } }, { status: 400 })
  }

  const note = typeof body.note === "string" ? body.note : ""
  const data = updateFeedbackStatus(body.id, body.status, note)

  if (!data) {
    return jsonResponse(request, { error: { code: "FEEDBACK_NOT_FOUND", message: "Feedback ticket was not found." } }, { status: 404 })
  }

  return jsonResponse(request, { data })
}
