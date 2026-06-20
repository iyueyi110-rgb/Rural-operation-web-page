"use client"

import { Bell, CheckCircle2, ClipboardList, WalletCards } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { fetchWithVillagerAuth } from "@web/lib/villager-auth-client"
import type { AppNotification, VillagerSummary, VillagerTask } from "@web/lib/villager-portal"

export function VillagerDashboardClient() {
  const t = useTranslations("villagerSystem")
  const [villager, setVillager] = useState<VillagerSummary | null>(null)
  const [tasks, setTasks] = useState<VillagerTask[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meResponse = await fetchWithVillagerAuth("/api/v1/villager/me")
        if (!meResponse.ok) throw new Error("villager request failed")
        const meResult = (await meResponse.json()) as { data: VillagerSummary }
        const [tasksResponse, notificationResponse] = await Promise.all([
          fetchWithVillagerAuth("/api/v1/villager/me/tasks"),
          fetch(
            `/api/v1/notifications?recipientType=villager&recipientId=${encodeURIComponent(meResult.data.id)}`,
          ),
        ])
        if (cancelled) return
        setVillager(meResult.data)
        setTasks(tasksResponse.ok ? ((await tasksResponse.json()) as { data: VillagerTask[] }).data : [])
        setNotifications(
          notificationResponse.ok
            ? ((await notificationResponse.json()) as { data: AppNotification[] }).data
            : [],
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !villager) {
    return <main className="mx-auto max-w-2xl p-5">{t("common.loading")}</main>
  }

  const pendingCount = tasks.filter((task) => ["pending", "accepted", "in_progress"].includes(task.status)).length
  const stats = [
    { label: t("dashboard.monthlyCompleted"), value: villager.monthlyTaskSummary.completedTasks, icon: CheckCircle2 },
    { label: t("dashboard.monthlyEarnings"), value: `¥${villager.monthlyTaskSummary.totalEarnings}`, icon: WalletCards },
    { label: t("dashboard.pendingTasks"), value: pendingCount, icon: ClipboardList },
  ]

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <p className="text-sm font-bold text-moss">{t("dashboard.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t("dashboard.greeting", { name: villager.name })}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {villager.skills.map((skill) => (
          <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-bold text-moss" key={skill}>{skill}</span>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <article className="rounded-lg border border-stone bg-white p-4 shadow-soft" key={label}>
            <Icon aria-hidden="true" className="h-5 w-5 text-water" />
            <div className="mt-3 text-2xl font-extrabold">{value}</div>
            <div className="mt-1 text-xs font-semibold text-ink/52">{label}</div>
          </article>
        ))}
      </div>

      <DashboardList title={t("dashboard.latestTasks")} empty={t("tasks.empty")}>
        {tasks.slice(0, 5).map((task) => (
          <div className="flex items-center justify-between gap-3 border-b border-stone/70 py-3 last:border-0" key={task.id}>
            <div><div className="font-bold">{task.title}</div><div className="text-xs text-ink/48">{task.status}</div></div>
            <span className="font-bold text-moss">¥{task.earnings}</span>
          </div>
        ))}
      </DashboardList>

      <DashboardList title={t("dashboard.latestNotifications")} empty={t("notifications.empty")} icon={<Bell className="h-4 w-4" />}>
        {notifications.slice(0, 5).map((notification) => (
          <div className="border-b border-stone/70 py-3 last:border-0" key={notification.id}>
            <div className="font-bold">{notification.title}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink/52">{notification.body}</div>
          </div>
        ))}
      </DashboardList>
    </main>
  )
}

function DashboardList({ title, empty, icon, children }: { title: string; empty: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <section className="mt-6 rounded-lg border border-stone bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">{icon}{title}</h2>
      <div className="mt-3">{hasChildren ? children : <p className="py-4 text-sm text-ink/48">{empty}</p>}</div>
    </section>
  )
}
