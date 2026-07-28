import { NextResponse, type NextRequest } from "next/server"

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@admin/lib/admin-session.server"
import { isGuestAdminRequestAllowed } from "@admin/lib/admin-guest-access"

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  if (
    isGuestAdminRequestAllowed(
      request.method,
      request.nextUrl.pathname,
    )
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const authenticated = await verifyAdminSession(
    session,
    process.env.ADMIN_SESSION_SECRET ?? "",
  )
  return authenticated
    ? NextResponse.next()
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export const config = {
  matcher: [
    "/((?!login|api/admin/session|_next/static|_next/image|favicon.ico|images).*)",
  ],
}
