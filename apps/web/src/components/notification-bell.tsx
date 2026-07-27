"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import {
  fetchWithAuth,
  getAuthToken,
  resolveTouristRecipientId,
} from "@web/lib/auth-client"

export function NotificationBell() {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const pathname = usePathname()
  const [recipientId, setRecipientId] = useState("")
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function refresh(effectiveId: string) {
      const response = await fetchWithAuth(`/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(effectiveId)}&isRead=false`)
      if (!response.ok || cancelled) return
      const result = (await response.json()) as { meta?: { total?: number } }
      setUnread(result.meta?.total ?? 0)
    }

    async function bootstrap() {
      const storedPhone = window.localStorage.getItem("tourist_phone")?.trim() ?? null
      let userId: string | null = null
      if (getAuthToken()) {
        const response = await fetchWithAuth("/api/v1/auth/me")
        if (response.ok) {
          userId = ((await response.json()) as { data: { id: string } }).data.id
        }
      }

      const effectiveId = resolveTouristRecipientId(userId, storedPhone)
      if (cancelled) return
      setRecipientId(effectiveId)
      if (!effectiveId) return
      await refresh(effectiveId)
      timer = window.setInterval(() => void refresh(effectiveId), 30_000)
    }

    void bootstrap()
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [pathname])

  if (!recipientId || pathname.includes("/villager/")) return null

  return (
    <Link aria-label={t("touristNotifications.open")} className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-soft transition hover:bg-moss" href={`/${locale}/me/notifications`}>
      <Bell aria-hidden="true" className="h-6 w-6" />
      {unread > 0 ? <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-lychee px-1.5 py-1 text-center text-[10px] font-extrabold text-white">{unread > 99 ? "99+" : unread}</span> : null}
    </Link>
  )
}
