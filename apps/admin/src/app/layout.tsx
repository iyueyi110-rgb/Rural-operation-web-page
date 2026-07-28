import type { Metadata } from "next"
import { cookies } from "next/headers"
import type { ReactNode } from "react"
import "leaflet/dist/leaflet.css"
import "./globals.css"
import { adminCopy } from "@admin/lib/admin-copy"
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@admin/lib/admin-session.server"
import { AdminShell } from "./admin-shell"

export const metadata: Metadata = {
  title: adminCopy.metadata.title,
  description: adminCopy.metadata.description,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = cookies().get(ADMIN_SESSION_COOKIE)?.value
  const canWrite = await verifyAdminSession(
    session,
    process.env.ADMIN_SESSION_SECRET ?? "",
  )

  return (
    <html lang="zh-CN">
      <body>
        <noscript>
          <div
            style={{
              background: "#b93835",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              padding: "16px",
              textAlign: "center",
            }}
          >
            请启用 JavaScript 以获得完整体验。部分功能在禁用 JS 时不可用。
          </div>
        </noscript>
        <AdminShell canWrite={canWrite}>{children}</AdminShell>
      </body>
    </html>
  )
}
