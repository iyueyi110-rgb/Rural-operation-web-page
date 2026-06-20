const TOKEN_KEY = "villager_token"
const TOKEN_PREFIX = "villager_"
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function decodeVillagerToken(token: string, now = Date.now()) {
  if (!token.startsWith(TOKEN_PREFIX)) return null

  try {
    const decoded = atob(token.slice(TOKEN_PREFIX.length))
    const [id, timestampValue, ...extra] = decoded.split("_")
    const timestamp = Number(timestampValue)
    if (!id || !timestampValue || extra.length > 0 || !Number.isFinite(timestamp)) return null
    if (timestamp > now || now - timestamp > TOKEN_MAX_AGE_MS) return null
    return { id, timestamp }
  } catch {
    return null
  }
}

export function getVillagerSession() {
  if (typeof window === "undefined") return null
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const decoded = decodeVillagerToken(token)
  return decoded ? { ...decoded, token } : null
}

export function saveVillagerToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearVillagerToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export function fetchWithVillagerAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const session = getVillagerSession()
  const headers = new Headers(init.headers)
  if (session) headers.set("X-Villager-Token", session.token)
  return fetch(input, { ...init, headers })
}
