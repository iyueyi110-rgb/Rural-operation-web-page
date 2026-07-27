import type { ReactNode } from "react"
import "leaflet/dist/leaflet.css"
import "./globals.css"
import { OfflineBanner } from "@web/components/offline-banner"

export default function RootLayout({ children }: { children: ReactNode }) {
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
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
