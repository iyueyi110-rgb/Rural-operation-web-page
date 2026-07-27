import { randomUUID } from "node:crypto"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { createJWT } from "@web/lib/auth-jwt"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const userId = `demo_${randomUUID().slice(0, 8)}`
  const jwtSalt = randomUUID()
  const token = await createJWT({ userId, role: "visitor" }, jwtSalt)

  return jsonResponse(request, {
    token,
    user: {
      id: userId,
      mobile: "demo_user",
      role: "visitor",
      demoMode: true,
    },
    meta: {
      demoMode: true,
      message: "演示模式登录成功，无需手机号",
    },
  })
}
