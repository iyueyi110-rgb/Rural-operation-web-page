import { jwtVerify, SignJWT } from "jose"

import { jwtSecret } from "@web/lib/auth-jwt"

export async function createVillagerToken(villagerId: string) {
  return new SignJWT({ villagerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret())
}

export async function getVillagerIdFromToken(
  request: Request,
): Promise<string | null> {
  const token = request.headers.get("X-Villager-Token")
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
    })
    return typeof payload.villagerId === "string" ? payload.villagerId : null
  } catch {
    return null
  }
}
