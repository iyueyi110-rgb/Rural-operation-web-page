"use client"

import { CheckCheck, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

import type { AppNotification } from "@web/lib/villager-portal"

const categories = ["all", "tree", "activity"] as const

export function TouristNotificationCenter() {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [category, setCategory] = useState<(typeof categories)[number]>("all")
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const load = useCallback(async (currentPhone = phone) => {
    if (!currentPhone) return
    const response = await fetch(`/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(currentPhone)}`)
    if (response.ok) {
      const result = (await response.json()) as { data: AppNotification[] }
      setNotifications(result.data.filter((item) => ["tree", "activity"].includes(item.category)))
    }
  }, [phone])

  useEffect(() => {
    const storedPhone = window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    setPhone(storedPhone)
    void load(storedPhone)
  }, [load])

  async function markAll() {
    if (!phone) return
    await fetch("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true, recipientType: "tourist", recipientId: phone }) })
    await load()
  }

  async function open(notification: AppNotification) {
    if (!notification.isRead) await fetch("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id, isRead: true }) })
    if (notification.refType === "tree_adoption" && notification.refId) router.push(`/${locale}/trees/${notification.refId}`)
    else await load()
  }

  const visible = notifications.filter((item) => category === "all" || item.category === category)

  return (
    <main className="min-h-screen bg-rice p-5 text-ink sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-water">{t("touristNotifications.eyebrow")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("touristNotifications.title")}</h1><p className="mt-2 text-sm text-ink/58">{t("touristNotifications.body")}</p></div><div className="flex gap-2"><button aria-label={t("common.refresh")} className="rounded-full border border-stone bg-white p-3" onClick={() => void load()} type="button"><RefreshCw className="h-4 w-4" /></button><button aria-label={t("notifications.markAll")} className="rounded-full bg-ink p-3 text-white" onClick={() => void markAll()} type="button"><CheckCheck className="h-4 w-4" /></button></div></div>
        <div className="mt-6 grid grid-cols-3 rounded-full border border-stone bg-white p-1">{categories.map((item) => <button className={`h-10 rounded-full text-sm font-bold ${category === item ? "bg-ink text-white" : "text-ink/55"}`} key={item} onClick={() => setCategory(item)} type="button">{t(`touristNotifications.categories.${item}`)}</button>)}</div>
        {!phone ? <p className="mt-6 rounded-lg border border-stone bg-white p-6 text-center text-sm text-ink/52">{t("touristNotifications.noIdentity")}</p> : null}
        <div className="mt-5 grid gap-3">{phone && visible.length === 0 ? <p className="rounded-lg border border-stone bg-white p-6 text-center text-sm text-ink/48">{t("notifications.empty")}</p> : visible.map((notification) => <button className={`relative overflow-hidden rounded-lg border border-stone bg-white p-5 text-left shadow-soft ${notification.isRead ? "opacity-65" : ""}`} key={notification.id} onClick={() => void open(notification)} type="button">{!notification.isRead ? <span className="absolute inset-y-0 left-0 w-1 bg-water" /> : null}<div className="font-extrabold">{notification.title}</div><p className="mt-2 text-sm leading-6 text-ink/60">{notification.body}</p><time className="mt-3 block text-xs text-ink/38">{new Date(notification.createdAt).toLocaleString()}</time></button>)}</div>
      </div>
    </main>
  )
}
