import { jwtVerify, SignJWT } from "jose"

const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const DEV_JWT_SECRET = "zouma-dev-jwt-secret-do-not-use-in-production"

export function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (secret) {
    return new TextEncoder().encode(secret)
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("JWT_SECRET not set, using development fallback secret")
    return new TextEncoder().encode(DEV_JWT_SECRET)
  }

  throw new Error(
    "JWT_SECRET environment variable is required in production. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  )
}

export async function createJWT(
  payload: { userId: string; role: string },
  salt: string,
  now = Date.now(),
) {
  const issuedAt = Math.floor(now / 1_000)
  return new SignJWT({ ...payload, salt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TOKEN_MAX_AGE_SECONDS)
    .sign(jwtSecret())
}

export async function verifyJWT(token: string, now = Date.now()) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
      currentDate: new Date(now),
    })
    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.salt !== "string"
    ) {
      return null
    }
    return { userId: payload.userId, role: payload.role, salt: payload.salt }
  } catch {
    return null
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  const token = authorization.slice("Bearer ".length).trim()
  return token || null
}
