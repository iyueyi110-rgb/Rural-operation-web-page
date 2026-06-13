"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface CrossRow extends Record<string, unknown> {
  nodeId: string
  nodeName: string
  peopleCount: number
  revenue: number
  orderCount: number
  conversionRate: number | null
  roi: number | null
  note?: string
}

type SortKey = "conversionRate" | "revenue" | "peopleCount"

export default function AnalyticsPage() {
  const [rows, setRows] = useState<CrossRow[]>([])
  const [date, setDate] = useState(today())
  const [sortKey, setSortKey] = useState<SortKey>("conversionRate")
  const [isLoading, setIsLoading] = useState(true)

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch(`${adminApiBase}/analytics/cross/flow-vs-spend?date=${date}`)
    const payload = (await response.json()) as { data?: CrossRow[] }
    setRows(payload.data ?? [])
    setIsLoading(false)
  }, [date])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const sortedRows = [...rows].sort((a, b) => Number(b[sortKey] ?? -1) - Number(a[sortKey] ?? -1))
  const columns = useMemo<Array<TableColumn<CrossRow>>>(
    () => [
      { key: "nodeName", label: "节点" },
      { key: "peopleCount", label: adminCopy.analytics.peopleCount },
      { key: "revenue", label: adminCopy.analytics.revenue, render: (value) => `¥${value}` },
      { key: "orderCount", label: adminCopy.analytics.orderCount },
      { key: "conversionRate", label: adminCopy.analytics.conversionRate, render: (value) => value == null ? "无客流" : `${(Number(value) * 100).toFixed(1)}%` },
      { key: "roi", label: adminCopy.analytics.roi, render: (value) => value == null ? "无客流" : `¥${Number(value).toFixed(2)}` },
    ],
    [],
  )

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.analytics.title}</h1>
      </header>
      <div className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-2">
        <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setSortKey(event.target.value as SortKey)} value={sortKey}>
          <option value="conversionRate">按转化率</option>
          <option value="revenue">按收入</option>
          <option value="peopleCount">按客流</option>
        </select>
      </div>
      <AdminDataTable columns={columns} emptyLabel={adminCopy.analytics.noData} isLoading={isLoading} rows={sortedRows} />
    </div>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}
