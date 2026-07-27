"use client"

import { CheckCheck, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

import { fetchWithAuth } from "@web/lib/auth-client"
import { EmptyState, PanelTitle, SegmentedControl, SurfacePanel } from "@web/components/subpage-ui"
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
    const response = await fetchWithAuth(`/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(currentPhone)}&category=tree&category=activity`)
    if (response.ok) {
      const result = (await response.json()) as { data: AppNotification[] }
      setNotifications(result.data)
    }
  }, [phone])

  useEffect(() => {
    const storedPhone = window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    setPhone(storedPhone)
    void load(storedPhone)
  }, [load])

  async function markAll() {
    if (!phone) return
    await fetchWithAuth("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true, recipientType: "tourist", recipientId: phone }) })
    await load()
  }

  async function open(notification: AppNotification) {
    if (!notification.isRead) await fetchWithAuth("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id, isRead: true }) })
    if (notification.refType === "tree_adoption" && notification.refId) router.push(`/${locale}/trees/${notification.refId}`)
    else await load()
  }

  const visible = notifications.filter((item) => category === "all" || item.category === category)

  return (
    <main className="min-h-screen bg-rice p-5 text-ink sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <PanelTitle>{t("touristNotifications.eyebrow")}</PanelTitle>
            <h1 className="mt-2 text-3xl font-extrabold">{t("touristNotifications.title")}</h1>
            <p className="mt-2 text-sm text-ink/58">{t("touristNotifications.body")}</p>
          </div>
          <div className="flex gap-2">
            <button aria-label={t("common.refresh")} className="rounded-full border border-line bg-surface p-3 transition hover:bg-rice" onClick={() => void load()} type="button"><RefreshCw className="h-4 w-4" /></button>
            <button aria-label={t("notifications.markAll")} className="rounded-full bg-ink p-3 text-white transition hover:bg-moss" onClick={() => void markAll()} type="button"><CheckCheck className="h-4 w-4" /></button>
          </div>
        </div>
        <SegmentedControl className="mt-6 grid-cols-3" labelFor={(item) => t(`touristNotifications.categories.${item}`)} onChange={setCategory} options={categories} value={category} />
        {!phone ? <EmptyState className="mt-6" title={t("touristNotifications.noIdentity")} /> : null}
        <div className="mt-5 grid gap-3">
          {phone && visible.length === 0 ? <EmptyState title={t("notifications.empty")} /> : null}
          {visible.map((notification) => (
            <SurfacePanel className={notification.isRead ? "opacity-65" : ""} key={notification.id}>
              <button className="w-full text-left" onClick={() => void open(notification)} type="button">
                <div className="font-extrabold">{notification.title}</div>
                <p className="mt-2 text-sm leading-6 text-ink/60">{notification.body}</p>
                <time className="mt-3 block text-xs text-ink/38">{new Date(notification.createdAt).toLocaleString()}</time>
              </button>
            </SurfacePanel>
          ))}
        </div>
      </div>
    </main>
  )
}
