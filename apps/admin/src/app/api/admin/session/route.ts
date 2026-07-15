import { NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE } from "@admin/lib/admin-session.server"
import { createAdminSessionHandler } from "@admin/lib/admin-session-handler.server"

export const runtime = "nodejs"

export const POST = createAdminSessionHandler()

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}
