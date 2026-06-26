import { prisma } from "@zouma/database"

import { getBearerToken, verifyJWT } from "@web/lib/auth-jwt"
import { jsonResponse } from "@web/lib/aigc-api"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { isAdminRequest, maskPhone } from "@web/lib/tree-records"

export async function requireUserSession(request: Request) {
  const token = getBearerToken(request)
  const session = token ? await verifyJWT(token) : null
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, jwtSalt: true, mobile: true, role: true },
  })
  if (
    !user ||
    !user.jwtSalt ||
    user.jwtSalt !== session.salt ||
    user.role !== session.role
  ) {
    return null
  }

  return user
}

export async function requireBearerAuth(request: Request) {
  const user = await requireUserSession(request)
  if (!user) {
    return {
      authorized: false as const,
      response: jsonResponse(
        request,
        { error: "Authentication required" },
        { status: 401 },
      ),
    }
  }
  return { authorized: true as const, user }
}

export async function requireTouristRecipient(
  request: Request,
  recipientId: string,
) {
  const user = await requireUserSession(request)
  if (!user) {
    return {
      authorized: false as const,
      response: jsonResponse(
        request,
        { error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  const allowedIds = new Set([user.id])
  const maskedMobile = maskPhone(user.mobile)
  if (maskedMobile) allowedIds.add(maskedMobile)

  if (!allowedIds.has(recipientId.trim())) {
    return {
      authorized: false as const,
      response: jsonResponse(
        request,
        { error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  return { authorized: true as const, user }
}

export async function requireVillagerRecipient(
  request: Request,
  recipientId: string,
) {
  const tokenVillagerId = await getVillagerIdFromToken(request)
  if (tokenVillagerId === recipientId.trim())
    return { authorized: true as const }

  return {
    authorized: false as const,
    response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }),
  }
}

export async function requireVillagerOrAdmin(
  request: Request,
  villagerId: string,
) {
  if (isAdminRequest(request)) return { authorized: true as const }

  const tokenVillagerId = await getVillagerIdFromToken(request)
  if (tokenVillagerId === villagerId) return { authorized: true as const }

  return {
    authorized: false as const,
    response: jsonResponse(request, { error: "Unauthorized" }, { status: 401 }),
  }
}
