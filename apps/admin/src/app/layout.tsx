import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Noto_Sans_SC } from "next/font/google"

import "leaflet/dist/leaflet.css"
import "./globals.css"
import { adminCopy } from "@admin/lib/admin-copy"
import { AdminShell } from "./admin-shell"

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: adminCopy.metadata.title,
  description: adminCopy.metadata.description,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={notoSansSc.className}>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}
