"use client"

import { TrendingUp, WalletCards } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import { fetchWithVillagerAuth } from "@web/lib/villager-auth-client"
import type { VillagerTask } from "@web/lib/villager-portal"
import { EmptyState, MetricTile, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

export function VillagerEarningsClient() {
  const t = useTranslations("villagerSystem")
  const [tasks, setTasks] = useState<VillagerTask[]>([])

  useEffect(() => {
    fetchWithVillagerAuth("/api/v1/villager/me/tasks?status=completed")
      .then((response) => response.json())
      .then((result: { data?: VillagerTask[] }) => setTasks(result.data ?? []))
      .catch(() => setTasks([]))
  }, [])

  const monthStart = useMemo(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }, [])
  const total = tasks.reduce((sum, task) => sum + task.earnings, 0)
  const monthly = tasks.filter((task) => new Date(task.updatedAt) >= monthStart).reduce((sum, task) => sum + task.earnings, 0)
  const max = Math.max(1, ...tasks.slice(0, 6).map((task) => task.earnings))

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <PanelTitle tone="moss">{t("earnings.eyebrow")}</PanelTitle>
      <h1 className="mt-2 text-3xl font-extrabold">{t("earnings.title")}</h1>
      <div className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <MetricTile icon={<WalletCards className="h-5 w-5" />} label={t("earnings.total")} tone="dark" value={`¥${total}`} />
        <MetricTile icon={<TrendingUp className="h-5 w-5" />} label={t("earnings.monthly")} value={`¥${monthly}`} />
      </div>
      <SurfacePanel className="mt-5">
        <h2 className="font-extrabold">{t("earnings.trend")}</h2>
        <div className="mt-5 flex h-32 items-end gap-3">
          {tasks.slice(0, 6).reverse().map((task) => <div className="flex flex-1 flex-col items-center gap-2" key={task.id}><div className="w-full rounded-t bg-water" style={{ height: `${Math.max(12, (task.earnings / max) * 100)}%` }} /><span className="text-[10px] text-ink/40">¥{task.earnings}</span></div>)}
        </div>
      </SurfacePanel>
      <SurfacePanel className="mt-5">
        <h2 className="font-extrabold">{t("earnings.completedTasks")}</h2>
        <div className="mt-3">
          {tasks.length === 0 ? <EmptyState title={t("earnings.empty")} /> : tasks.map((task) => <div className="flex justify-between gap-4 border-b border-line py-3 last:border-0" key={task.id}><div><div className="font-bold">{task.title}</div><div className="text-xs text-ink/45">{new Date(task.updatedAt).toLocaleDateString()}</div></div><span className="font-extrabold text-moss">+¥{task.earnings}</span></div>)}
        </div>
      </SurfacePanel>
    </main>
  )
}
