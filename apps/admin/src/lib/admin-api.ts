import { adminCopy } from "@admin/lib/admin-copy"

export const adminApiBase = process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"

export function nodeDisplayName(slug?: string | null, nameKey?: string | null) {
  return (
    (slug && adminCopy.nodeNameMap[slug as keyof typeof adminCopy.nodeNameMap]) ||
    (nameKey && adminCopy.nodeNameMap[nameKey as keyof typeof adminCopy.nodeNameMap]) ||
    slug ||
    nameKey ||
    "未标记点位"
  )
}
