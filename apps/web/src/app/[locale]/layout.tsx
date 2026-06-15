import type { ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { Noto_Sans_SC } from "next/font/google"
import { notFound } from "next/navigation"

import "leaflet/dist/leaflet.css"
import "../globals.css"
import { locales, type Locale } from "@web/i18n/routing"

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { locale: Locale }
}) {
  if (!locales.includes(params.locale)) {
    notFound()
  }

  setRequestLocale(params.locale)
  const messages = await getMessages()

  return (
    <html lang={params.locale} className={notoSansSc.className}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
