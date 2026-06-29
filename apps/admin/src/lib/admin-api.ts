import { adminCopy } from "@admin/lib/admin-copy"

export const adminApiBase = process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"
export const adminApiToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? ""

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchAdminApi<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (adminApiToken) {
    headers.set("X-Admin-Token", adminApiToken)
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetchWithTimeout(`${adminApiBase}${path}`, { ...init, headers })
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null

  if (!response.ok || payload === null) {
    throw new Error(payload?.error?.trim() || `API ${response.status}: ${path}`)
  }

  return payload
}

export function nodeDisplayName(slug?: string | null, nameKey?: string | null) {
  return (
    (slug && adminCopy.nodeNameMap[slug as keyof typeof adminCopy.nodeNameMap]) ||
    (nameKey && adminCopy.nodeNameMap[nameKey as keyof typeof adminCopy.nodeNameMap]) ||
    slug ||
    nameKey ||
    "未标记点位"
  )
}
