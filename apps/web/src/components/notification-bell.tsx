"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

export function NotificationBell() {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const pathname = usePathname()
  const [phone, setPhone] = useState("")
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const storedPhone = window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    setPhone(storedPhone)
    if (!storedPhone) return

    let cancelled = false
    async function refresh() {
      const response = await fetch(`/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(storedPhone)}&isRead=false`)
      if (!response.ok || cancelled) return
      const result = (await response.json()) as { meta?: { total?: number } }
      setUnread(result.meta?.total ?? 0)
    }
    void refresh()
    const timer = window.setInterval(refresh, 30_000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [pathname])

  if (!phone || pathname.includes("/villager/")) return null

  return (
    <Link aria-label={t("touristNotifications.open")} className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-soft transition hover:bg-moss" href={`/${locale}/me/notifications`}>
      <Bell aria-hidden="true" className="h-6 w-6" />
      {unread > 0 ? <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-lychee px-1.5 py-1 text-center text-[10px] font-extrabold text-white">{unread > 99 ? "99+" : unread}</span> : null}
    </Link>
  )
}
