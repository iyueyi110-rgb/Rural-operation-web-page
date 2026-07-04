"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"

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

const dimensionLabel: Record<string, string> = {
  energy: "节能",
  spatial: "空间",
  ecological: "生态",
}

const interventionLabel: Record<string, string> = {
  renovation: "保留改造",
  partial_demolish_rebuild: "部分拆除",
  full_demolish_rebuild: "拆除重建",
  new_construction: "场地新建",
  extension: "扩建",
  adaptive_reuse: "功能置换",
  landscape_intervention: "景观生态",
}

export default function RenovationPage() {
  const router = useRouter()
  const [rows, setRows] = useState<StrategyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")

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

  const columns: Array<TableColumn<StrategyRow>> = [
    { key: "node", label: "空间节点", render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
    { key: "title", label: "策略" },
    { key: "interventionType", label: "干预", render: (value) => interventionLabel[String(value)] ?? String(value ?? "-") },
    { key: "dimension", label: "维度", render: (value) => dimensionLabel[String(value)] ?? String(value) },
    { key: "priority", label: "优先级" },
    { key: "status", label: "状态" },
    { key: "estimatedDuration", label: "工期", render: (value) => String(value ?? "-") },
    { key: "estimatedCostRange", label: "造价", render: (value) => String(value ?? "-") },
  ]

  return (
    <AdminPageShell description="查看由后端诊断引擎和 AI 增强层生成的空间改造策略。" eyebrow="空间改造" title="改造策略">
      {message ? <AdminNotice tone="error">{message}</AdminNotice> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard icon={<Building2 className="h-4 w-4" />} label="策略总数" value={stats.total} />
        <AdminStatCard icon={<CircleAlert className="h-4 w-4" />} label="紧急策略" value={stats.critical} />
        <AdminStatCard icon={<LoaderCircle className="h-4 w-4" />} label="进行中" value={stats.active} />
        <AdminStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="已完成" value={stats.completed} />
      </div>
      <AdminPanel>
        <AdminDataTable
          columns={columns}
          emptyLabel="暂无改造策略。可通过后端诊断接口生成。"
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/renovation/${row.id}`)}
          rows={rows}
        />
      </AdminPanel>
    </AdminPageShell>
  )
}
