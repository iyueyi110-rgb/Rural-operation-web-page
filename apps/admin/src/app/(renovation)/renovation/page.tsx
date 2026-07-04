"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, CircleAlert, LoaderCircle, RefreshCw, X } from "lucide-react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { RenovationSpatialDiagram } from "@admin/components/renovation-spatial-diagram"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"
import {
  buildRenovationDiagramNodes,
  getDimensionLabel,
  getInterventionLabel,
  getRealmLabel,
} from "@admin/lib/renovation-diagram"

interface StrategyRow extends Record<string, unknown> {
  id: string
  nodeId: string
  title: string
  dimension: string
  interventionType?: string | null
  priority: string
  status: string
  estimatedDuration?: string | null
  estimatedCostRange?: string | null
  createdAt: string
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
}

export default function RenovationPage() {
  const router = useRouter()
  const [rows, setRows] = useState<StrategyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [selectedNodeId, setSelectedNodeId] = useState("")
  const [filters, setFilters] = useState({ interventionType: "", priority: "", status: "", realm: "" })

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    setMessage("")
    try {
      const payload = await fetchAdminApi<{ data: StrategyRow[] }>("/renovation/strategies")
      setRows(payload.data ?? [])
    } catch {
      setRows([])
      setMessage("改造策略数据暂不可用。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const stats = useMemo(
    () => ({
      total: rows.length,
      critical: rows.filter((row) => row.priority === "critical").length,
      active: rows.filter((row) => row.status === "approved" || row.status === "in_progress").length,
      completed: rows.filter((row) => row.status === "completed" || row.status === "verified").length,
    }),
    [rows],
  )

  const diagramNodes = useMemo(() => buildRenovationDiagramNodes(rows), [rows])
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (selectedNodeId && row.nodeId !== selectedNodeId) return false
        if (filters.interventionType && row.interventionType !== filters.interventionType) return false
        if (filters.priority && row.priority !== filters.priority) return false
        if (filters.status && row.status !== filters.status) return false
        if (filters.realm && row.node?.realm !== filters.realm) return false
        return true
      }),
    [filters, rows, selectedNodeId],
  )

  const filterOptions = useMemo(
    () => ({
      interventionType: unique(rows.map((row) => row.interventionType).filter(isString)),
      priority: unique(rows.map((row) => row.priority).filter(isString)),
      status: unique(rows.map((row) => row.status).filter(isString)),
      realm: unique(rows.map((row) => row.node?.realm).filter(isString)),
    }),
    [rows],
  )

  const hasActiveFilters = Boolean(
    selectedNodeId || filters.interventionType || filters.priority || filters.status || filters.realm,
  )

  const clearFilters = () => {
    setSelectedNodeId("")
    setFilters({ interventionType: "", priority: "", status: "", realm: "" })
  }

  const columns: Array<TableColumn<StrategyRow>> = [
    { key: "node", label: "空间节点", render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
    { key: "title", label: "策略" },
    { key: "interventionType", label: "干预", render: (value) => getInterventionLabel(isString(value) ? value : undefined) },
    { key: "dimension", label: "维度", render: (value) => getDimensionLabel(isString(value) ? value : undefined) },
    { key: "priority", label: "优先级" },
    { key: "status", label: "状态" },
    { key: "estimatedDuration", label: "工期", render: (value) => String(value ?? "-") },
    { key: "estimatedCostRange", label: "造价", render: (value) => String(value ?? "-") },
  ]

  return (
    <AdminPageShell
      actions={
        <button
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink"
          onClick={loadRows}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      }
      description="查看由后端诊断引擎和 AI 增强层生成的空间改造策略，并通过示意图理解节点、诊断和干预关系。"
      eyebrow="空间改造"
      title="空间改造工作台"
    >
      {message ? <AdminNotice tone="error">{message}</AdminNotice> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard icon={<Building2 className="h-4 w-4" />} label="策略总数" value={stats.total} />
        <AdminStatCard icon={<CircleAlert className="h-4 w-4" />} label="紧急策略" value={stats.critical} />
        <AdminStatCard icon={<LoaderCircle className="h-4 w-4" />} label="进行中" value={stats.active} />
        <AdminStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="已完成" value={stats.completed} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="grid min-w-0 gap-4">
          <AdminPanel>
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="干预类型"
                onChange={(value) => setFilters((current) => ({ ...current, interventionType: value }))}
                options={filterOptions.interventionType.map((value) => ({ label: getInterventionLabel(value), value }))}
                value={filters.interventionType}
              />
              <FilterSelect
                label="优先级"
                onChange={(value) => setFilters((current) => ({ ...current, priority: value }))}
                options={filterOptions.priority.map((value) => ({ label: value, value }))}
                value={filters.priority}
              />
              <FilterSelect
                label="状态"
                onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                options={filterOptions.status.map((value) => ({ label: value, value }))}
                value={filters.status}
              />
              <FilterSelect
                label="分区"
                onChange={(value) => setFilters((current) => ({ ...current, realm: value }))}
                options={filterOptions.realm.map((value) => ({ label: getRealmLabel(value), value }))}
                value={filters.realm}
              />
              {hasActiveFilters ? (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-rice px-4 text-sm font-bold text-ink/62"
                  onClick={clearFilters}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  清除
                </button>
              ) : null}
            </div>
            <div className="mt-3 text-xs font-bold text-ink/42">
              当前显示 {filteredRows.length} / {rows.length} 条策略
            </div>
          </AdminPanel>

          <AdminDataTable
            columns={columns}
            emptyLabel="暂无改造策略。可通过后端诊断接口生成。"
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/renovation/${row.id}`)}
            rows={filteredRows}
          />
        </div>

        <AdminPanel>
          <RenovationSpatialDiagram
            nodes={diagramNodes}
            onSelectNode={(nodeId) => setSelectedNodeId((current) => (current === nodeId ? "" : nodeId))}
            selectedNodeId={selectedNodeId}
          />
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="grid min-w-36 gap-1 text-xs font-bold text-ink/52">
      {label}
      <select
        className="h-10 rounded-lg border border-line bg-rice px-3 text-sm font-bold text-ink"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">全部</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "zh-CN"))
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}
