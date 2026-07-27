export const ADMIN_SESSION_COOKIE = "zouma_admin_session"
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60

const encoder = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!
  }
  return difference === 0
}

async function hmac(value: string, secret: string) {
  if (secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters")
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  )
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  )
}

export async function authenticateAdminPassword(
  candidate: string,
  expected: string,
) {
  if (!candidate || !expected) return false
  const [candidateDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ])
  return equalBytes(
    new Uint8Array(candidateDigest),
    new Uint8Array(expectedDigest),
  )
}

export async function createAdminSession(
  secret: string,
  now = Date.now(),
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS,
) {
  const payload = base64UrlEncode(
    encoder.encode(JSON.stringify({ expiresAt: now + ttlSeconds * 1_000 })),
  )
  const signature = base64UrlEncode(await hmac(payload, secret))
  return `${payload}.${signature}`
}

export async function verifyAdminSession(
  value: string | null | undefined,
  secret: string,
  now = Date.now(),
) {
  if (!value || !secret) return false
  const [payload, signature, extra] = value.split(".")
  if (!payload || !signature || extra) return false
  try {
    const expected = await hmac(payload, secret)
    if (!equalBytes(base64UrlDecode(signature), expected)) return false
    const parsed = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    ) as { expiresAt?: unknown }
    return typeof parsed.expiresAt === "number" && parsed.expiresAt > now
  } catch {
    return false
  }
}

export function readCookie(cookieHeader: string | null, name: string) {
  for (const part of (cookieHeader ?? "").split(";")) {
    const separator = part.indexOf("=")
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return null
}
