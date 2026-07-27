import { randomInt } from "node:crypto"

import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@web/lib/rate-limit"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(
    getRateLimitKey(request, "otp-request"),
    3,
    60,
  )
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(
      request,
      { error: "Invalid SMS request" },
      { status: 400 },
    )
  }

  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : ""
  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    return jsonResponse(
      request,
      { error: "A valid mobile is required" },
      { status: 400 },
    )
  }

  const user = await prisma.user.upsert({
    where: { mobile },
    create: { mobile, role: "visitor" },
    update: {},
  })
  const code = String(randomInt(100000, 1_000_000))
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: code, otpExpiry: new Date(Date.now() + 5 * 60 * 1_000) },
  })

  return jsonResponse(request, { success: true, message: "验证码已发送" })
}
