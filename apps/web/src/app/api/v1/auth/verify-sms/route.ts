import { randomUUID } from "node:crypto"

import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { createJWT } from "@web/lib/auth-jwt"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid SMS verification" }, { status: 400 })
  }

  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : ""
  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!/^1[3-9]\d{9}$/.test(mobile) || !/^\d{6}$/.test(code)) {
    return jsonResponse(request, { error: "mobile and code are required" }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { mobile, otpCode: code, otpExpiry: { gt: new Date() } },
  })
  if (!user) {
    return jsonResponse(request, { error: "Verification code is invalid or expired" }, { status: 401 })
  }

  const jwtSalt = randomUUID()
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { jwtSalt, lastLoginAt: new Date(), otpCode: null, otpExpiry: null },
  })
  const token = await createJWT({ userId: updated.id, role: updated.role }, jwtSalt)

  return jsonResponse(request, {
    token,
    user: {
      id: updated.id,
      mobile: updated.mobile,
      role: updated.role,
      locale: updated.locale,
    },
  })
}
