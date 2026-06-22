"use client"

import { CalendarDays, Filter, Sprout } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

interface FarmingCalendarRow {
  id: string
  solarTerm: string
  title: string
  description: string
  activityType: "planting" | "pruning" | "fertilizing" | "harvesting" | "processing" | "festival"
  startDate: string
  endDate?: string | null
  treeSpecies?: string | null
  status: "upcoming" | "active" | "completed"
}

const activityTypes = ["all", "planting", "pruning", "fertilizing", "harvesting", "processing", "festival"] as const
const statuses = ["all", "upcoming", "active", "completed"] as const
const speciesOptions = ["all", "lychee", "longan"] as const

export function FarmingCalendar() {
  const t = useTranslations("calendar")
  const [rows, setRows] = useState<FarmingCalendarRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activityType, setActivityType] = useState<(typeof activityTypes)[number]>("all")
  const [status, setStatus] = useState<(typeof statuses)[number]>("all")
  const [treeSpecies, setTreeSpecies] = useState<(typeof speciesOptions)[number]>("all")

  useEffect(() => {
    let active = true

    async function loadCalendar() {
      setIsLoading(true)
      const response = await fetch("/api/v1/farming-calendar")
      const payload = (await response.json()) as { data?: FarmingCalendarRow[] }
      if (active) {
        setRows(payload.data ?? [])
        setIsLoading(false)
      }
    }

    void loadCalendar()
    return () => {
      active = false
    }
  }, [])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const typeMatched = activityType === "all" || row.activityType === activityType
        const statusMatched = status === "all" || row.status === status
        const speciesMatched = treeSpecies === "all" || row.treeSpecies === treeSpecies
        return typeMatched && statusMatched && speciesMatched
      }),
    [activityType, rows, status, treeSpecies],
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-bold text-water">
          <Filter aria-hidden="true" className="h-4 w-4" />
          {t("filters.title")}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            {t("filters.activityType")}
            <select className="h-12 rounded-md border border-stone bg-rice px-3" onChange={(event) => setActivityType(event.target.value as (typeof activityTypes)[number])} value={activityType}>
              {activityTypes.map((type) => <option key={type} value={type}>{type === "all" ? t("filters.all") : t(`activityTypes.${type}`)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t("filters.status")}
            <select className="h-12 rounded-md border border-stone bg-rice px-3" onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])} value={status}>
              {statuses.map((item) => <option key={item} value={item}>{item === "all" ? t("filters.all") : t(`statuses.${item}`)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t("filters.treeSpecies")}
            <select className="h-12 rounded-md border border-stone bg-rice px-3" onChange={(event) => setTreeSpecies(event.target.value as (typeof speciesOptions)[number])} value={treeSpecies}>
              {speciesOptions.map((item) => <option key={item} value={item}>{item === "all" ? t("filters.all") : t(`species.${item}`)}</option>)}
            </select>
          </label>
        </div>
      </aside>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-bold text-lychee">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {t("timeline.title")}
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-md bg-rice p-5 text-sm font-semibold text-ink/54">{t("messages.loading")}</div>
        ) : filteredRows.length ? (
          <div className="mt-6 grid gap-4">
            {filteredRows.map((row) => (
              <article className="grid gap-4 rounded-lg border border-stone bg-rice p-5 sm:grid-cols-[110px_minmax(0,1fr)]" key={row.id}>
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-extrabold text-water">{row.solarTerm}</div>
                  <div className="mt-2 text-xs font-bold text-ink/52">{row.startDate}</div>
                  {row.endDate ? <div className="text-xs font-bold text-ink/52">- {row.endDate}</div> : null}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-moss">{t(`activityTypes.${row.activityType}`)}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-lychee">{t(`statuses.${row.status}`)}</span>
                    {row.treeSpecies ? <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-water">{t(`species.${row.treeSpecies}`)}</span> : null}
                  </div>
                  <h2 className="mt-3 break-words text-2xl font-extrabold">{row.title}</h2>
                  <p className="mt-3 break-words text-sm leading-7 text-ink/66">{row.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex min-h-40 items-center justify-center rounded-md bg-rice text-sm font-bold text-ink/54">
            <Sprout aria-hidden="true" className="mr-2 h-4 w-4" />
            {t("messages.empty")}
          </div>
        )}
      </section>
    </div>
  )
}
