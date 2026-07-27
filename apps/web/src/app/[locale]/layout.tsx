import type { ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { NotificationBell } from "@web/components/notification-bell"
import { locales, type Locale } from "@web/i18n/routing"

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
    <NextIntlClientProvider messages={messages}>
      {children}
      <NotificationBell />
    </NextIntlClientProvider>
  )
}
