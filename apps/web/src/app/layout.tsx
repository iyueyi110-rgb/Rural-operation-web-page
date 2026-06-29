import type { ReactNode } from "react"
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google"

import "leaflet/dist/leaflet.css"
import "./globals.css"
import { OfflineBanner } from "@web/components/offline-banner"

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
})

const notoSerifSc = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-serif",
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSansSc.variable} ${notoSerifSc.variable}`}
    >
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
