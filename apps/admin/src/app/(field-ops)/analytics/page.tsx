"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { adminApiBase, fetchWithTimeout } from "@admin/lib/admin-api"
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

interface RouteRankingRow extends Record<string, unknown> {
  routeId: string
  generationCount: number
  providers: Record<string, number>
}

type SortKey = "conversionRate" | "revenue" | "peopleCount"

export default function AnalyticsPage() {
  const [rows, setRows] = useState<CrossRow[]>([])
  const [routeRows, setRouteRows] = useState<RouteRankingRow[]>([])
  const [date, setDate] = useState(today())
  const [sortKey, setSortKey] = useState<SortKey>("conversionRate")
  const [isLoading, setIsLoading] = useState(true)

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    const [response, routeResponse] = await Promise.all([
      fetchWithTimeout(`${adminApiBase}/analytics/cross/flow-vs-spend?date=${date}`),
      fetchWithTimeout(`${adminApiBase}/analytics/routes/ranking?days=30`),
    ])
    const payload = (await response.json()) as { data?: CrossRow[] }
    const routePayload = (await routeResponse.json()) as { data?: RouteRankingRow[] }
    setRows(payload.data ?? [])
    setRouteRows(routePayload.data ?? [])
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
  const routeColumns = useMemo<Array<TableColumn<RouteRankingRow>>>(
    () => [
      { key: "routeId", label: "路线" },
      { key: "generationCount", label: "生成次数" },
      { key: "providers", label: "来源", render: (value) => Object.entries(value as Record<string, number>).map(([provider, count]) => `${provider}:${count}`).join(" / ") || "-" },
    ],
    [],
  )

  return (
    <AdminPageShell
      description="对照节点客流、消费收入和路线生成记录，定位转化效率变化。"
      eyebrow={adminCopy.shell.subtitle}
      title={adminCopy.analytics.title}
    >
      <AdminPanel className="grid gap-3 p-4 md:grid-cols-2">
        <input className="h-10 rounded-md border border-line bg-rice px-3 outline-none transition focus:border-water focus:bg-white" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        <select className="h-10 rounded-md border border-line bg-rice px-3 outline-none transition focus:border-water focus:bg-white" onChange={(event) => setSortKey(event.target.value as SortKey)} value={sortKey}>
          <option value="conversionRate">按转化率</option>
          <option value="revenue">按收入</option>
          <option value="peopleCount">按客流</option>
        </select>
      </AdminPanel>
      <AdminDataTable columns={columns} emptyLabel={adminCopy.analytics.noData} isLoading={isLoading} rows={sortedRows} />
      <AdminPanel>
        <h2 className="text-lg font-extrabold">路线生成热度排行</h2>
        <div className="mt-4">
          <AdminDataTable columns={routeColumns} emptyLabel="暂无路线生成记录。" isLoading={isLoading} rows={routeRows} />
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}
