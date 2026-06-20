import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getBearerToken, verifyJWT } from "@web/lib/auth-jwt"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  const session = token ? await verifyJWT(token) : null
  if (!session) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  })
  if (!user || !user.jwtSalt || user.jwtSalt !== session.salt || user.role !== session.role) {
    return jsonResponse(request, { error: "Unauthorized" }, { status: 401 })
  }

  return jsonResponse(request, {
    data: {
      id: user.id,
      mobile: user.mobile,
      nickname: user.nickname,
      role: user.role,
      locale: user.locale,
      profile: user.profile,
    },
  })
}
