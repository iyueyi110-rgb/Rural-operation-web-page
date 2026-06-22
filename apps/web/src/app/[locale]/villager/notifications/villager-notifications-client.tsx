"use client"

import { CheckCheck, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

import { fetchWithVillagerAuth, getVillagerSession } from "@web/lib/villager-auth-client"
import type { AppNotification } from "@web/lib/villager-portal"

export function VillagerNotificationsClient() {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const sessionId = getVillagerSession()?.id ?? ""

  const load = useCallback(async () => {
    if (!sessionId) return
    const response = await fetchWithVillagerAuth(`/api/v1/notifications?recipientType=villager&recipientId=${encodeURIComponent(sessionId)}`)
    if (response.ok) setNotifications(((await response.json()) as { data: AppNotification[] }).data)
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  async function markAll() {
    if (!sessionId) return
    await fetchWithVillagerAuth("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true, recipientType: "villager", recipientId: sessionId }) })
    await load()
  }

  async function open(notification: AppNotification) {
    if (!notification.isRead) await fetchWithVillagerAuth("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id, isRead: true }) })
    if (notification.refType === "task") router.push(`/${locale}/villager/tasks`)
    else await load()
  }

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-moss">{t("notifications.eyebrow")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("notifications.title")}</h1></div><div className="flex gap-2"><button aria-label={t("common.refresh")} className="rounded-full border border-stone bg-white p-3" onClick={() => void load()} type="button"><RefreshCw className="h-4 w-4" /></button><button aria-label={t("notifications.markAll")} className="rounded-full bg-ink p-3 text-white" onClick={() => void markAll()} type="button"><CheckCheck className="h-4 w-4" /></button></div></div>
      <div className="mt-6 grid gap-3">
        {notifications.length === 0 ? <p className="rounded-lg border border-stone bg-white p-6 text-center text-sm text-ink/48">{t("notifications.empty")}</p> : notifications.map((notification) => <button className={`relative overflow-hidden rounded-lg border border-stone bg-white p-5 text-left shadow-soft ${notification.isRead ? "opacity-65" : ""}`} key={notification.id} onClick={() => void open(notification)} type="button">{!notification.isRead ? <span className="absolute inset-y-0 left-0 w-1 bg-water" /> : null}<div className="font-extrabold">{notification.title}</div><p className="mt-2 text-sm leading-6 text-ink/60">{notification.body}</p><time className="mt-3 block text-xs text-ink/38">{new Date(notification.createdAt).toLocaleString()}</time></button>)}
      </div>
    </main>
  )
}
