"use client"

import { AlertTriangle, CheckCircle2, RefreshCw, SendHorizontal } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import { adminCopy } from "@admin/lib/admin-copy"
import type { Feedback, FeedbackRecord } from "@zouma/contracts"

type FeedbackStatus = Feedback["status"]

const apiBase = process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"
const statusOrder: FeedbackStatus[] = ["submitted", "assigned", "processing", "resolved", "closed"]

const statusTone: Record<FeedbackStatus, string> = {
  submitted: "border-water/20 bg-water/10 text-water",
  assigned: "border-moss/20 bg-moss/10 text-moss",
  processing: "border-lychee/20 bg-lychee/10 text-lychee",
  resolved: "border-moss/20 bg-moss/10 text-moss",
  closed: "border-ink/15 bg-ink/10 text-ink/64",
}

const severityTone: Record<Feedback["severity"], string> = {
  low: "text-ink/56",
  medium: "text-water",
  high: "text-lychee",
  urgent: "bg-lychee text-white",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function FeedbackContent() {
  const [records, setRecords] = useState<FeedbackRecord[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<FeedbackStatus | "">("")

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? records[0] ?? null,
    [records, selectedId],
  )

  const stats = useMemo(() => {
    const open = records.filter((record) => !["resolved", "closed"].includes(record.status)).length
    const urgent = records.filter((record) => record.severity === "high" || record.severity === "urgent").length
    const average =
      records.length > 0
        ? (records.reduce((sum, record) => sum + record.rating, 0) / records.length).toFixed(1)
        : "0.0"

    return {
      total: records.length,
      open,
      urgent,
      average,
    }
  }, [records])

  async function loadRecords() {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${apiBase}/feedback`, { cache: "no-store" })

      if (!response.ok) {
        throw new Error("load failed")
      }

      const result = (await response.json()) as { data: FeedbackRecord[] }
      setRecords(result.data)
      setSelectedId((current) => current || result.data[0]?.id || "")
    } catch {
      setError(adminCopy.detail.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  async function updateStatus(status: FeedbackStatus) {
    if (!selectedRecord) {
      return
    }

    setUpdatingStatus(status)
    setError("")

    try {
      const response = await fetch(`${apiBase}/feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedRecord.id,
          status,
          note,
        }),
      })

      if (!response.ok) {
        throw new Error("update failed")
      }

      const result = (await response.json()) as { data: FeedbackRecord }
      setRecords((current) => current.map((record) => (record.id === result.data.id ? result.data : record)))
      setNote("")
    } catch {
      setError(adminCopy.detail.loadFailed)
    } finally {
      setUpdatingStatus("")
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  return (
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.shell.activeModule}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-normal sm:text-3xl">{adminCopy.table.title}</h1>
        </div>
        <button
          className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold text-ink transition hover:border-ink"
          onClick={loadRecords}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {adminCopy.shell.refresh}
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label={adminCopy.stats.total} value={String(stats.total)} />
        <Stat label={adminCopy.stats.open} value={String(stats.open)} />
        <Stat label={adminCopy.stats.urgent} value={String(stats.urgent)} />
        <Stat label={adminCopy.stats.rating} value={stats.average} />
      </div>

      <p className="mt-4 rounded-md border border-stone bg-white px-4 py-3 text-sm font-semibold text-ink/58 shadow-soft">
        {adminCopy.shell.apiHint}
      </p>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-lychee/10 px-4 py-3 text-sm font-semibold text-lychee">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-stone bg-white shadow-soft">
          <div className="grid grid-cols-[1.1fr_0.65fr_0.65fr_0.65fr] gap-3 border-b border-stone bg-ink px-4 py-3 text-xs font-bold text-white/72 sm:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.85fr]">
            <div>{adminCopy.table.title}</div>
            <div>{adminCopy.table.category}</div>
            <div>{adminCopy.table.severity}</div>
            <div>{adminCopy.table.status}</div>
            <div className="hidden sm:block">{adminCopy.table.updatedAt}</div>
          </div>

          {isLoading ? (
            <div className="p-5 text-sm font-semibold text-ink/54">{adminCopy.loading}</div>
          ) : records.length === 0 ? (
            <div className="p-5 text-sm font-semibold text-ink/54">{adminCopy.shell.empty}</div>
          ) : (
            <div className="divide-y divide-stone">
              {records.map((record) => (
                <button
                  className={
                    selectedRecord?.id === record.id
                      ? "grid w-full grid-cols-[1.1fr_0.65fr_0.65fr_0.65fr] gap-3 bg-rice px-4 py-4 text-left sm:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.85fr]"
                      : "grid w-full grid-cols-[1.1fr_0.65fr_0.65fr_0.65fr] gap-3 px-4 py-4 text-left transition hover:bg-rice sm:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.85fr]"
                  }
                  key={record.id}
                  onClick={() => setSelectedId(record.id)}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">{record.id}</div>
                    <div className="mt-1 truncate text-xs text-ink/54">{record.content}</div>
                  </div>
                  <Cell>{adminCopy.categories[record.category]}</Cell>
                  <Cell>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${severityTone[record.severity]}`}>
                      {adminCopy.severities[record.severity]}
                    </span>
                  </Cell>
                  <Cell>
                    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusTone[record.status]}`}>
                      {adminCopy.statuses[record.status]}
                    </span>
                  </Cell>
                  <Cell className="hidden sm:block">{formatDate(record.updatedAt)}</Cell>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 rounded-lg border border-stone bg-white p-5 shadow-soft">
          {selectedRecord ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-water">{adminCopy.detail.title}</p>
                  <h2 className="mt-1 break-all text-xl font-extrabold">{selectedRecord.id}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[selectedRecord.status]}`}>
                  {adminCopy.statuses[selectedRecord.status]}
                </span>
              </div>

              <div className="mt-5 grid gap-3 rounded-md bg-rice p-4 text-sm sm:grid-cols-2">
                <Meta label={adminCopy.table.category} value={adminCopy.categories[selectedRecord.category]} />
                <Meta label={adminCopy.table.severity} value={adminCopy.severities[selectedRecord.severity]} />
                <Meta label={adminCopy.table.rating} value={`${selectedRecord.rating}/5`} />
                <Meta label={adminCopy.table.updatedAt} value={formatDate(selectedRecord.updatedAt)} />
              </div>

              <div className="mt-5">
                <div className="text-sm font-bold">{adminCopy.detail.content}</div>
                <p className="mt-2 break-all rounded-md border border-stone p-3 text-sm leading-7 text-ink/68">
                  {selectedRecord.content}
                </p>
              </div>

              <label className="mt-5 grid gap-2">
                <span className="text-sm font-bold">{adminCopy.detail.noteLabel}</span>
                <textarea
                  className="min-h-[96px] resize-none rounded-md border border-stone bg-rice p-3 text-sm leading-6 outline-none transition focus:border-ink"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={adminCopy.detail.notePlaceholder}
                  value={note}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusOrder.map((status) => (
                  <button
                    className={
                      selectedRecord.status === status
                        ? "flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white"
                        : "flex h-10 items-center justify-center gap-2 rounded-md border border-stone bg-rice px-3 text-sm font-bold text-ink transition hover:border-ink"
                    }
                    disabled={updatingStatus !== "" || selectedRecord.status === status}
                    key={status}
                    onClick={() => updateStatus(status)}
                    type="button"
                  >
                    {updatingStatus === status ? (
                      <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                    )}
                    {adminCopy.statuses[status]}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-moss" />
                  {adminCopy.detail.timeline}
                </div>
                <div className="mt-3 grid gap-3">
                  {selectedRecord.handlingRecords.map((record) => (
                    <div className="border-l-2 border-stone pl-4" key={record.id}>
                      <div className="text-xs font-bold text-water">
                        {formatDate(record.createdAt)} / {adminCopy.statuses[record.status]} / {record.operator}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-ink/66">{record.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/58">{adminCopy.detail.noSelection}</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-semibold text-ink/54">{label}</div>
    </div>
  )
}

function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 truncate text-xs font-semibold text-ink/62 ${className}`}>{children}</div>
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink/48">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value}</div>
    </div>
  )
}
