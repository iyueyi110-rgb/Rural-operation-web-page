"use client"

import { CalendarPlus, RefreshCw, Sunrise } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface FarmingRow extends Record<string, unknown> {
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

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? ""
const solarTerms = ["立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"]
const activityTypes = ["planting", "pruning", "fertilizing", "harvesting", "processing", "festival"] as const
const statuses = ["upcoming", "active", "completed"] as const

export default function FarmingPage() {
  const [rows, setRows] = useState<FarmingRow[]>([])
  const [selected, setSelected] = useState<FarmingRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    solarTerm: "清明",
    title: "荔枝春梢观察",
    description: "记录荔枝树春梢、花序和养护状态，为后续采摘和认养更新准备素材。",
    activityType: "pruning",
    startDate: "2026-04-04",
    endDate: "",
    treeSpecies: "lychee",
    status: "upcoming",
  })

  async function loadData() {
    setIsLoading(true)
    const response = await fetch(`${adminApiBase}/farming-calendar`)
    const payload = (await response.json()) as { data?: FarmingRow[] }
    setRows(payload.data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  function selectRow(row: FarmingRow) {
    setSelected(row)
    setForm({
      solarTerm: row.solarTerm,
      title: row.title,
      description: row.description,
      activityType: row.activityType,
      startDate: row.startDate,
      endDate: row.endDate ?? "",
      treeSpecies: row.treeSpecies ?? "",
      status: row.status,
    })
  }

  function resetForm() {
    setSelected(null)
    setForm({
      solarTerm: "清明",
      title: "",
      description: "",
      activityType: "harvesting",
      startDate: "",
      endDate: "",
      treeSpecies: "",
      status: "upcoming",
    })
  }

  async function saveFarming() {
    setMessage("")
    const response = await fetch(`${adminApiBase}/farming-calendar`, {
      method: selected ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({
        ...(selected ? { id: selected.id } : {}),
        ...form,
        endDate: form.endDate || null,
        treeSpecies: form.treeSpecies || null,
      }),
    })
    setMessage(response.ok ? adminCopy.farming.saved : adminCopy.farming.saveFailed)
    if (response.ok) {
      await loadData()
      resetForm()
    }
  }

  const columns = useMemo<Array<TableColumn<FarmingRow>>>(
    () => [
      { key: "solarTerm", label: adminCopy.farming.solarTerm },
      { key: "title", label: adminCopy.farming.activityTitle },
      { key: "activityType", label: adminCopy.farming.activityType, render: (value) => adminCopy.farming.activityTypes[value as keyof typeof adminCopy.farming.activityTypes] ?? String(value ?? "") },
      { key: "startDate", label: adminCopy.farming.startDate },
      { key: "status", label: adminCopy.farming.status, render: (value) => adminCopy.farming.statuses[value as keyof typeof adminCopy.farming.statuses] ?? String(value ?? "") },
    ],
    [],
  )

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.farming.subtitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.farming.title}</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold" onClick={resetForm} type="button">
            <CalendarPlus className="h-4 w-4" />
            {adminCopy.farming.create}
          </button>
          <button className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold" onClick={loadData} type="button">
            <RefreshCw className="h-4 w-4" />
            {adminCopy.common.refresh}
          </button>
        </div>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard icon={<Sunrise className="h-4 w-4" />} label={adminCopy.farming.title} value={isLoading ? "..." : rows.length} />
        <AdminStatCard label={adminCopy.farming.statuses.active} value={rows.filter((row) => row.status === "active").length} />
        <AdminStatCard label={adminCopy.farming.statuses.upcoming} value={rows.filter((row) => row.status === "upcoming").length} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <AdminDataTable columns={columns} emptyLabel={adminCopy.farming.noData} isLoading={isLoading} onRowClick={selectRow} rows={rows} selectedId={selected?.id} />

        <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="text-lg font-extrabold">{selected ? adminCopy.farming.activityTitle : adminCopy.farming.create}</div>
          <div className="mt-4 grid gap-3">
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, solarTerm: event.target.value })} value={form.solarTerm}>
              {solarTerms.map((term) => <option key={term} value={term}>{term}</option>)}
            </select>
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={adminCopy.farming.activityTitle} value={form.title} />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, activityType: event.target.value })} value={form.activityType}>
                {activityTypes.map((type) => <option key={type} value={type}>{adminCopy.farming.activityTypes[type]}</option>)}
              </select>
              <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>
                {statuses.map((status) => <option key={status} value={status}>{adminCopy.farming.statuses[status]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, startDate: event.target.value })} type="date" value={form.startDate} />
              <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, endDate: event.target.value })} type="date" value={form.endDate} />
            </div>
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, treeSpecies: event.target.value })} placeholder={adminCopy.farming.treeSpecies} value={form.treeSpecies} />
            <textarea className="min-h-28 rounded-md border border-stone bg-rice px-3 py-2" onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={adminCopy.farming.description} value={form.description} />
          </div>
          <button className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white" onClick={saveFarming} type="button">
            {adminCopy.farming.save}
          </button>
        </section>
      </div>
    </div>
  )
}
