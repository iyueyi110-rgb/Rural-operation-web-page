const guestAdminPostPaths = new Set([
  "/knowledge/query",
  "/ai/query",
  "/ai/generate-content",
  "/renovation/run-weekly",
  "/infrastructure/decide",
])

function relativeAdminPath(pathname: string) {
  const adminPrefix = "/api/admin"
  if (
    !pathname.startsWith("/") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    pathname.includes("\\")
  ) {
    return null
  }
  if (pathname === adminPrefix) return "/"
  if (pathname.startsWith(`${adminPrefix}/`)) {
    return pathname.slice(adminPrefix.length)
  }
  if (pathname.startsWith("/api/")) return null
  return pathname
}

export function isGuestAdminRequestAllowed(method: string, pathname: string) {
  const relativePath = relativeAdminPath(pathname)
  if (relativePath === null) return false
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") return true
  if (normalizedMethod !== "POST") return false
  return guestAdminPostPaths.has(relativePath)
}
