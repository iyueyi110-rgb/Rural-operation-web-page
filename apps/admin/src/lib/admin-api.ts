import { fetchWithTimeout } from "@zouma/utils/fetch-timeout"

import { adminCopy } from "@admin/lib/admin-copy"

export { fetchWithTimeout }

export const adminApiBase = "/api/admin"

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
