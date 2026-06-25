import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { isMainlandMobile, normalizeMainlandMobile } from "@web/lib/phone"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid OTP request" }, { status: 400 })
  }

  const phone = normalizeMainlandMobile(body.phone)
  if (!isMainlandMobile(phone)) {
    return jsonResponse(request, { error: "有效的手机号是必填项" }, { status: 400 })
  }

  const villager = await prisma.villager.findFirst({ where: { phone, status: "active" } })
  if (!villager) {
    return jsonResponse(request, { error: "未找到匹配村民" }, { status: 404 })
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  await prisma.villager.update({
    where: { id: villager.id },
    data: { otpCode: otp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) },
  })

  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] Villager OTP code:", otp)
    return jsonResponse(request, {
      success: true,
      message: "验证码已发送",
      otp,
    })
  }

  return jsonResponse(request, { success: true, message: "验证码已发送" })
}
