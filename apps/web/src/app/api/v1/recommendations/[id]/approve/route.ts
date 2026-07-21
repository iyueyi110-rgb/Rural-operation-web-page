import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import {
  getRecommendationReviewStatus,
  isAllowedRecommendationEndpoint,
} from "@web/lib/recommendation-generator"
import { shouldExecuteRecommendationActions } from "@web/lib/adoption-agent-schema"
import { isAdminRequest } from "@web/lib/tree-records"

interface ActionTrigger {
  endpoint: string
  method: "POST" | "PATCH"
  payload: Record<string, unknown>
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid review payload" },
      { status: 400 },
    )
  }

  const action =
    body.action === "reject"
      ? "reject"
      : body.action === "approve" || body.action === undefined
        ? "approve"
        : null
  if (!action) {
    return jsonResponse(
      request,
      { error: "Invalid review action" },
      { status: 400 },
    )
  }

  const existing = await prisma.recommendation.findUnique({
    where: { id: params.id },
  })
  if (!existing) {
    return jsonResponse(
      request,
      { error: "Recommendation not found" },
      { status: 404 },
    )
  }

  const nextStatus = getRecommendationReviewStatus(existing.status, action)
  if (!nextStatus) {
    return jsonResponse(
      request,
      { error: "Invalid recommendation status transition" },
      { status: 409 },
    )
  }

  if (nextStatus === "rejected") {
    const data = await prisma.recommendation.update({
      where: { id: existing.id },
      data: { status: "rejected", approvedBy: null, approvedAt: null },
    })
    return jsonResponse(request, { data, meta: { triggers: [] } })
  }

  const triggers = collectActionTriggers(existing.actionSteps)
  const blocked = triggers.find(
    (trigger) => !isAllowedRecommendationEndpoint(trigger.endpoint),
  )
  if (blocked) {
    console.warn("Blocked recommendation action endpoint", {
      recommendationId: existing.id,
      endpoint: blocked.endpoint,
    })
    return jsonResponse(
      request,
      { error: "Action endpoint is not allowed" },
      { status: 400 },
    )
  }

  const approvedBy =
    typeof body.approvedBy === "string" && body.approvedBy.trim()
      ? body.approvedBy.trim()
      : request.headers.get("x-admin-user")?.trim() || "admin"
  const data = await prisma.recommendation.update({
    where: { id: existing.id },
    data: { status: "approved", approvedBy, approvedAt: new Date() },
  })
  if (!shouldExecuteRecommendationActions(existing.type)) {
    return jsonResponse(request, {
      data,
      meta: { triggers: [], shadowMode: true },
    })
  }
  const triggerResults = await executeActionTriggers(request, triggers)

  return jsonResponse(request, { data, meta: { triggers: triggerResults } })
}

function collectActionTriggers(value: unknown): ActionTrigger[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isPlainObject)
    .map((step): ActionTrigger | null => {
      const endpoint =
        typeof step.api_trigger_endpoint === "string"
          ? step.api_trigger_endpoint.trim()
          : ""
      if (!endpoint) return null

      return {
        endpoint,
        method: step.method === "PATCH" ? "PATCH" : "POST",
        payload: isPlainObject(step.payload) ? step.payload : {},
      }
    })
    .filter((trigger): trigger is ActionTrigger => trigger !== null)
}

async function executeActionTriggers(
  request: Request,
  triggers: ActionTrigger[],
) {
  return Promise.all(
    triggers.map(async (trigger) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        const response = await fetch(new URL(trigger.endpoint, request.url), {
          method: trigger.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(trigger.payload),
          signal: controller.signal,
        })
        return {
          endpoint: trigger.endpoint,
          ok: response.ok,
          status: response.status,
        }
      } catch (error) {
        console.error("Recommendation action trigger failed", {
          recommendationId: request.url,
          endpoint: trigger.endpoint,
          error,
        })
        return { endpoint: trigger.endpoint, ok: false, status: 0 }
      } finally {
        clearTimeout(timeout)
      }
    }),
  )
}
