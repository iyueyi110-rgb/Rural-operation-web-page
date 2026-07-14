import { NextResponse, type NextRequest } from "next/server"

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@admin/lib/admin-session.server"

export async function middleware(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const authenticated = await verifyAdminSession(
    session,
    process.env.ADMIN_SESSION_SECRET ?? "",
  )
  if (authenticated) return NextResponse.next()
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: [
    "/((?!login|api/admin/session|_next/static|_next/image|favicon.ico|images).*)",
  ],
}
