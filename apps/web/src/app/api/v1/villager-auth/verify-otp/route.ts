import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { createVillagerToken } from "@web/lib/villager-auth"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid OTP verification" }, { status: 400 })
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const otp = typeof body.otp === "string" ? body.otp.trim() : ""
  if (!phone || !otp) {
    return jsonResponse(request, { error: "phone and otp are required" }, { status: 400 })
  }

  const villager = await prisma.$transaction(async (tx) => {
    const found = await tx.villager.findFirst({
      where: { phone, otpCode: otp, otpExpiry: { gt: new Date() }, status: "active" },
    })
    if (!found) return null

    return tx.villager.update({
      where: { id: found.id },
      data: { otpCode: null, otpExpiry: null },
    })
  })
  if (!villager) {
    return jsonResponse(request, { error: "验证码无效或已过期" }, { status: 401 })
  }

  return jsonResponse(request, {
    token: createVillagerToken(villager.id),
    villager: {
      id: villager.id,
      name: villager.name,
      skills: villager.skills,
      nodeId: villager.nodeId,
      status: villager.status,
    },
  })
}
