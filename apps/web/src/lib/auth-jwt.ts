import { jwtVerify, SignJWT } from "jose"

const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  return new TextEncoder().encode(secret)
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
