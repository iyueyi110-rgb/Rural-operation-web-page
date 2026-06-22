"use client"

import { useCallback, useEffect, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { adminApiBase, fetchAdminApi } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface AlertRow extends Record<string, unknown> {
  id: string
  alertType: keyof typeof adminCopy.alerts.types | string
  source: "behavior" | "sensor" | "weather"
  severity: string
  status: string
  message: string
  createdAt: string
}

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([])
  const [status, setStatus] = useState("active")
  const [type, setType] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({ status, run: "true" })
    if (type) params.set("type", type)
    const [behaviorResult, sensorResult, weatherResult] = await Promise.allSettled([
      fetch(`${adminApiBase}/alerts?${params}`).then((response) => response.json()) as Promise<{ data?: AlertRow[] }>,
      fetch(`${adminApiBase}/infrastructure/alerts`).then((response) => response.json()) as Promise<{ data?: Array<{ id: string; sensorId: string; type: string; value: number; unit: string; createdAt: string }> }>,
      fetch(`${adminApiBase}/weather/alerts`).then((response) => response.json()) as Promise<{ data?: Array<{ id: string; type: string; severity: string; title: string; text: string; createdAt: string }> }>,
    ])
    const behaviorRows =
      behaviorResult.status === "fulfilled"
        ? (behaviorResult.value.data ?? []).map((row) => ({ ...row, source: "behavior" as const }))
        : []
    const sensorRows =
      sensorResult.status === "fulfilled"
        ? (sensorResult.value.data ?? []).map((row) => ({
            id: `sensor-${row.id}`,
            alertType: row.type,
            source: "sensor" as const,
            severity: "high",
            status: "active",
            message: `${row.sensorId} ${row.type}=${row.value}${row.unit}`,
            createdAt: row.createdAt,
          }))
        : []
    const weatherRows =
      weatherResult.status === "fulfilled"
        ? (weatherResult.value.data ?? []).map((row) => ({
            id: `weather-${row.id}`,
            alertType: row.type,
            source: "weather" as const,
            severity: row.severity,
            status: "active",
            message: `${row.title}：${row.text}`,
            createdAt: row.createdAt,
          }))
        : []
    setRows([...behaviorRows, ...sensorRows, ...weatherRows].filter((row) => !type || row.alertType === type))
    setIsLoading(false)
  }, [status, type])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  async function updateStatus(id: string, nextStatus: string) {
    try {
      await fetchAdminApi("/alerts", {
        method: "PATCH",
        body: JSON.stringify({ id, status: nextStatus }),
      })
      setMessage("告警状态已更新。")
      await loadRows()
    } catch {
      setMessage("告警状态更新失败。")
    }
  }

  const columns: Array<TableColumn<AlertRow>> = [
    { key: "source", label: "来源", render: (value) => sourceLabel(String(value)) },
    { key: "alertType", label: adminCopy.alerts.type, render: (value) => adminCopy.alerts.types[value as keyof typeof adminCopy.alerts.types] ?? String(value) },
    { key: "severity", label: adminCopy.alerts.severity },
    { key: "status", label: adminCopy.alerts.status },
    { key: "message", label: adminCopy.alerts.message },
    { key: "createdAt", label: "时间", render: (value) => new Date(String(value)).toLocaleString("zh-CN") },
    {
      key: "id",
      label: "操作",
      render: (_value, row) => (
        <span className="flex gap-2">
          {row.source === "behavior" && row.status === "active" ? <button className="text-water" onClick={() => updateStatus(row.id, "acknowledged")} type="button">确认</button> : null}
          {row.source === "behavior" && row.status === "acknowledged" ? <button className="text-moss" onClick={() => updateStatus(row.id, "resolved")} type="button">解决</button> : null}
        </span>
      ),
    },
  ]

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.alerts.title}</h1>
      </header>
      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}
      <div className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-2">
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setType(event.target.value)} value={type}>
          <option value="">全部类型</option>
          {Object.entries(adminCopy.alerts.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="active">active</option>
          <option value="acknowledged">acknowledged</option>
          <option value="resolved">resolved</option>
        </select>
      </div>
      <AdminDataTable columns={columns} emptyLabel={adminCopy.alerts.noData} isLoading={isLoading} rows={rows} />
    </div>
  )
}

function sourceLabel(value: string) {
  if (value === "sensor") return "传感器"
  if (value === "weather") return "天气"
  return "行为"
}
