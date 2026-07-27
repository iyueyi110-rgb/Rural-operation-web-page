export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    console.error("ADMIN_API_TOKEN environment variable is not configured")
    return false
  }
  return request.headers.get("x-admin-token") === expected
}
