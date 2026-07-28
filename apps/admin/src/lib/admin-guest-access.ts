const guestAdminPostPaths = new Set([
  "/knowledge/query",
  "/ai/query",
  "/ai/generate-content",
  "/renovation/run-weekly",
  "/infrastructure/decide",
])

function relativeAdminPath(pathname: string) {
  const adminPrefix = "/api/admin"
  return pathname.startsWith(`${adminPrefix}/`)
    ? pathname.slice(adminPrefix.length)
    : pathname
}

export function isGuestAdminRequestAllowed(method: string, pathname: string) {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") return true
  if (normalizedMethod !== "POST") return false
  return guestAdminPostPaths.has(relativeAdminPath(pathname))
}
