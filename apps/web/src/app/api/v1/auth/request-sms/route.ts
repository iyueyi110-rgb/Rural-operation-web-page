import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid SMS request" }, { status: 400 })
  }

  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : ""
  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    return jsonResponse(request, { error: "A valid mobile is required" }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { mobile },
    create: { mobile, role: "visitor" },
    update: {},
  })
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: code, otpExpiry: new Date(Date.now() + 5 * 60 * 1_000) },
  })

  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] Tourist OTP code:", code)
  }

  return jsonResponse(request, { success: true, message: "验证码已发送" })
}
