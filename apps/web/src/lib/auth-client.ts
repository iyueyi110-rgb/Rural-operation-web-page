import { fetchWithTimeout } from "@web/lib/fetch-timeout"

const AUTH_TOKEN_KEY = "auth_token"

interface ReadableStorage {
  getItem(key: string): string | null
}

export function readAuthToken(storage: ReadableStorage) {
  return storage.getItem(AUTH_TOKEN_KEY)?.trim() || null
}

export function getAuthToken() {
  if (typeof window === "undefined") return null
  return readAuthToken(window.localStorage)
}

export function saveAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function buildAuthHeaders(token: string | null, initial?: HeadersInit) {
  const headers = new Headers(initial)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return headers
}

export function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetchWithTimeout(input, { ...init, headers: buildAuthHeaders(getAuthToken(), init.headers) })
}

export function rememberTouristIdentity(phone: string) {
  const normalizedPhone = phone.trim()
  const masked = normalizedPhone.length >= 11
    ? `${normalizedPhone.slice(0, 3)}****${normalizedPhone.slice(7)}`
    : normalizedPhone
  window.localStorage.setItem("tourist_phone", masked)
  const token = getAuthToken()
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function resolveTouristRecipientId(userId: string | null, legacyPhone: string | null) {
  return userId?.trim() || legacyPhone?.trim() || ""
}
