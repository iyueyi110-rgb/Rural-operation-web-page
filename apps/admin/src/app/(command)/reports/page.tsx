"use client"

import { RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { adminApiBase, fetchAdminApi, fetchWithTimeout } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface DailyReport {
  id: string
  date: string
  title: string
  summary: string
  sections: Array<{ type: string; title: string; content: string }>
  actionItems: Array<{ priority: string; category: string; action: string; deadline?: string }>
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [date, setDate] = useState(today())
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  async function loadReports() {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetchWithTimeout(`${adminApiBase}/reports`)
      if (!response.ok) throw new Error(adminCopy.common.error)
      const result = (await response.json()) as { data: DailyReport[] }
      setReports(result.data)
      setSelectedId((current) => current || result.data[0]?.id || "")
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  async function generateReport() {
    setIsGenerating(true)
    setError("")

    try {
      await fetchAdminApi("/reports", {
        method: "POST",
        body: JSON.stringify({ date }),
      })
      await loadReports()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  const selected = reports.find((report) => report.id === selectedId) ?? reports[0] ?? null

  return (
    <AdminPageShell
      description="沉淀每日运营摘要、行动建议和后续跟进项。"
      eyebrow={adminCopy.shell.subtitle}
      title={adminCopy.reports.title}
    >
      <AdminPanel className="flex flex-wrap items-end gap-3 p-4">
        <label className="grid gap-1 text-sm font-bold">
          {adminCopy.reports.selectDate}
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <button
          className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={isGenerating}
          onClick={generateReport}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? adminCopy.reports.generating : adminCopy.reports.generate}
        </button>
      </AdminPanel>

      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminPanel className="p-4">
          {isLoading ? <p className="text-sm font-semibold text-ink/54">{adminCopy.common.loading}</p> : null}
          {!isLoading && reports.length === 0 ? <p className="text-sm font-semibold text-ink/54">{adminCopy.reports.noData}</p> : null}
          <div className="grid gap-2">
            {reports.map((report) => (
              <button
                className={selected?.id === report.id ? "rounded-md bg-rice p-3 text-left" : "rounded-md p-3 text-left hover:bg-rice"}
                key={report.id}
                onClick={() => setSelectedId(report.id)}
                type="button"
              >
                <div className="text-sm font-extrabold">{report.date}</div>
                <div className="mt-1 truncate text-xs font-semibold text-ink/54">{report.title}</div>
              </button>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel>
          {selected ? (
            <div>
              <p className="text-sm font-bold text-water">{selected.date}</p>
              <h2 className="mt-1 text-2xl font-extrabold">{selected.title}</h2>
              <p className="mt-4 text-sm leading-7 text-ink/66">{selected.summary}</p>
              <h3 className="mt-6 text-lg font-extrabold">{adminCopy.reports.actions}</h3>
              <div className="mt-3 grid gap-2">
                {selected.actionItems.map((item) => (
                  <div className="rounded-md bg-rice p-3 text-sm font-semibold text-ink/70" key={item.action}>
                    <span className={priorityTone(item.priority)}>{item.priority}</span> / {item.category} / {item.action}
                    {item.deadline ? <span className="text-ink/45"> / {item.deadline}</span> : null}
                  </div>
                ))}
              </div>
              <h3 className="mt-6 text-lg font-extrabold">{adminCopy.reports.sections}</h3>
              <div className="mt-3 grid gap-3">
                {selected.sections.map((section) => (
                  <section className="rounded-md border border-stone p-3" key={`${section.type}-${section.title}`}>
                    <div className="text-sm font-extrabold">{section.title}</div>
                    <p className="mt-2 text-sm leading-7 text-ink/64">{section.content}</p>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/54">{adminCopy.reports.noData}</p>
          )}
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}

function priorityTone(priority: string) {
  if (priority === "high") return "font-extrabold text-lychee"
  if (priority === "medium") return "font-extrabold text-water"
  return "font-extrabold text-ink/45"
}
