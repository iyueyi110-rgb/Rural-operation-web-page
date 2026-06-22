import { buildContentFactoryPrompt, CONTENT_FACTORY_SYSTEM_PROMPTS, type ContentFactoryType } from "@zouma/prompts/content-factory"
import { ModelProviderAdapter } from "@zouma/utils"
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@web/lib/rate-limit"
import { isAdminRequest } from "@web/lib/tree-records"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"

const contentTypes = ["narration", "script", "social"] as const

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(getRateLimitKey(request, "ai-generate-content"), 5, 60)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid content generation payload" }, { status: 400 })
  }

  const type = typeof body.type === "string" && contentTypes.includes(body.type as ContentFactoryType)
    ? (body.type as ContentFactoryType)
    : undefined

  if (!type) {
    return jsonResponse(request, { error: "Invalid content type" }, { status: 400 })
  }

  const prompt = buildContentFactoryPrompt({
    type,
    scene: typeof body.scene === "string" ? body.scene.trim() : undefined,
    activity: typeof body.activity === "string" ? body.activity.trim() : undefined,
    season: typeof body.season === "string" ? body.season.trim() : undefined,
    audience: typeof body.audience === "string" ? body.audience.trim() : undefined,
  })

  try {
    const completion = await ModelProviderAdapter.complete(prompt, {
      systemPrompt: CONTENT_FACTORY_SYSTEM_PROMPTS[type],
      temperature: 0.5,
    })

    return jsonResponse(request, {
      data: {
        type,
        content: completion.content.trim(),
        provider: completion.provider,
        model: completion.model,
        latencyMs: completion.latencyMs,
      },
    })
  } catch (error) {
    console.error("Content generation failed:", error)
    return jsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : "AI content generation failed",
        provider: "configuration-required",
      },
      { status: 503 },
    )
  }
}
