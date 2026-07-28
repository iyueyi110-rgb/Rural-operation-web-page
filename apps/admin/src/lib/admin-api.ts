import { fetchWithTimeout as fetchWithTimeoutBase } from "@zouma/utils/fetch-timeout"

import { notifyAdminSessionExpired } from "@admin/components/admin-access"
import { adminCopy } from "@admin/lib/admin-copy"
import { isGuestAdminRequestAllowed } from "@admin/lib/admin-guest-access"

export const adminApiBase = "/api/admin"

function requestMethod(input: RequestInfo | URL, init: RequestInit) {
  return init.method ?? (input instanceof Request ? input.method : "GET")
}

function requestPathname(input: RequestInfo | URL) {
  const url =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.href
        : input
  return new URL(url, "http://admin.local").pathname
}

function isProtectedAdminRequest(
  input: RequestInfo | URL,
  init: RequestInit,
) {
  const pathname = requestPathname(input)
  return (
    (pathname === adminApiBase ||
      pathname.startsWith(`${adminApiBase}/`)) &&
    !isGuestAdminRequestAllowed(requestMethod(input, init), pathname)
  )
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const response = await fetchWithTimeoutBase(input, init, timeoutMs)
  if (response.status === 401 && isProtectedAdminRequest(input, init)) {
    notifyAdminSessionExpired()
  }
  return response
}

export async function fetchAdminApi<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetchWithTimeout(`${adminApiBase}${path}`, {
    ...init,
    headers,
  })
  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as
        | (T & { error?: string })
        | null)
    : ((await response.text()) as T)

  if (!response.ok || payload === null) {
    const apiError =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error).trim()
        : ""
    throw new Error(apiError || `API ${response.status}: ${path}`)
  }

  return payload
}

export function nodeDisplayName(slug?: string | null, nameKey?: string | null) {
  return (
    (slug &&
      adminCopy.nodeNameMap[slug as keyof typeof adminCopy.nodeNameMap]) ||
    (nameKey &&
      adminCopy.nodeNameMap[nameKey as keyof typeof adminCopy.nodeNameMap]) ||
    slug ||
    nameKey ||
    "未标记点位"
  )
}
