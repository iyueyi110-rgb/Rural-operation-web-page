import { randomInt } from "node:crypto"

import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isMainlandMobile, normalizeMainlandMobile } from "@web/lib/phone"
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@web/lib/rate-limit"

const DEMO_OTP = "888888"

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
      { error: "Invalid OTP request" },
      { status: 400 },
    )
  }

  const phone = normalizeMainlandMobile(body.phone)
  if (!isMainlandMobile(phone)) {
    return jsonResponse(
      request,
      { error: "有效的手机号是必填项" },
      { status: 400 },
    )
  }

  const villager = await prisma.villager.findFirst({
    where: { phone, status: "active" },
  })
  if (!villager) {
    return jsonResponse(request, { error: "未找到匹配村民" }, { status: 404 })
  }

  const smsUnavailable =
    !process.env.SMS_API_KEY?.trim() || !process.env.SMS_TEMPLATE_ID?.trim()
  const demoMode = process.env.NODE_ENV === "development" && smsUnavailable
  const otp = demoMode ? DEMO_OTP : String(randomInt(100000, 1_000_000))

  await prisma.villager.update({
    where: { id: villager.id },
    data: { otpCode: otp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) },
  })

  if (demoMode) {
    return jsonResponse(request, {
      success: true,
      message: "验证码已发送",
      demoMode: true,
      otp,
    })
  }

  return jsonResponse(request, { success: true, message: "验证码已发送" })
}
