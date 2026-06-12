import { NextResponse } from "next/server"

import {
  createFeedbackRecord,
  isFeedbackCategory,
  isFeedbackSeverity,
  isFeedbackStatus,
  listFeedbackRecords,
  updateFeedbackStatus,
} from "@web/lib/feedback-store"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export function GET() {
  const data = listFeedbackRecords()

  return jsonResponse({
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
    return jsonResponse({ error: { code: "INVALID_FEEDBACK", message: "Feedback category or severity is invalid." } }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  const rating = Number(body.rating)

  if (content.length < 8 || content.length > 500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse({ error: { code: "INVALID_FEEDBACK_CONTENT", message: "Feedback content or rating is invalid." } }, { status: 400 })
  }

  const data = createFeedbackRecord({
    category: body.category,
    severity: body.severity,
    content,
    rating,
  })

  return jsonResponse({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.id !== "string" || !isFeedbackStatus(body.status)) {
    return jsonResponse({ error: { code: "INVALID_STATUS_UPDATE", message: "Feedback id or status is invalid." } }, { status: 400 })
  }

  const note = typeof body.note === "string" ? body.note : ""
  const data = updateFeedbackStatus(body.id, body.status, note)

  if (!data) {
    return jsonResponse({ error: { code: "FEEDBACK_NOT_FOUND", message: "Feedback ticket was not found." } }, { status: 404 })
  }

  return jsonResponse({ data })
}
