"use client"

import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { fetchWithVillagerAuth } from "@web/lib/villager-auth-client"
import type { VillagerTask } from "@web/lib/villager-portal"
import { EmptyState, PanelTitle, SegmentedControl, SurfacePanel } from "@web/components/subpage-ui"

const filters = ["pending", "active", "completed"] as const

export function VillagerTasksClient() {
  const t = useTranslations("villagerSystem")
  const [tasks, setTasks] = useState<VillagerTask[]>([])
  const [filter, setFilter] = useState<(typeof filters)[number]>("pending")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetchWithVillagerAuth("/api/v1/villager/me/tasks")
    if (response.ok) setTasks(((await response.json()) as { data: VillagerTask[] }).data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function advance(task: VillagerTask) {
    const next = task.status === "pending" ? "accepted" : task.status === "accepted" ? "in_progress" : "completed"
    const response = await fetchWithVillagerAuth("/api/v1/villager/me/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: next }),
    })
    if (response.ok) await load()
  }

  const visible = tasks.filter((task) => {
    if (filter === "pending") return task.status === "pending"
    if (filter === "active") return ["accepted", "in_progress"].includes(task.status)
    return task.status === "completed"
  })

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <PanelTitle tone="moss">{t("tasks.eyebrow")}</PanelTitle>
      <h1 className="mt-2 text-3xl font-extrabold">{t("tasks.title")}</h1>
      <SegmentedControl className="mt-6 grid-cols-3" labelFor={(item) => t(`tasks.filters.${item}`)} onChange={setFilter} options={filters} value={filter} />
      <div className="mt-5 grid gap-3">
        {loading ? <SurfacePanel>{t("common.loading")}</SurfacePanel> : null}
        {!loading && visible.length === 0 ? <EmptyState title={t("tasks.empty")} /> : null}
        {visible.map((task) => (
          <SurfacePanel key={task.id}>
            <button className="flex w-full items-start justify-between gap-4 text-left" onClick={() => setExpanded(expanded === task.id ? null : task.id)} type="button">
              <div><div className="text-lg font-extrabold">{task.title}</div><div className="mt-1 text-xs font-semibold text-water">{task.taskType} / {task.node?.slug ?? t("tasks.noNode")}</div></div>
              <div className="flex items-center gap-2 font-bold text-moss">¥{task.earnings}<ChevronDown className={`h-4 w-4 transition ${expanded === task.id ? "rotate-180" : ""}`} /></div>
            </button>
            {expanded === task.id ? (
              <div className="mt-4 border-t border-stone pt-4">
                <p className="text-sm leading-7 text-ink/62">{task.description || t("tasks.noDescription")}</p>
                <p className="mt-2 text-xs text-ink/45">{task.scheduledDate || t("tasks.noDeadline")}</p>
                {task.status !== "completed" ? <button className="btn-primary mt-4 h-10 px-5 bg-ink hover:bg-moss" onClick={() => void advance(task)} type="button">{t(`tasks.actions.${task.status}`)}</button> : null}
              </div>
            ) : null}
          </SurfacePanel>
        ))}
      </div>
    </main>
  )
}
