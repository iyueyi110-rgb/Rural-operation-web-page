import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid OTP request" }, { status: 400 })
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  if (!phone) {
    return jsonResponse(request, { error: "phone is required" }, { status: 400 })
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

  return jsonResponse(request, { success: true, message: "验证码已生成", otp })
}
