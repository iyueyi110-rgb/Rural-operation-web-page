"use client"

import { useCallback, useEffect, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"

interface AssessmentRow extends Record<string, unknown> {
  id: string
  nodeId: string
  assessedAt: string
  structuralScore: number
  aestheticScore: number
  functionalScore: number
  safetyScore: number
  energyScore: number
  ecologicalScore: number
  demolitionRecommendation?: string | null
  reusePotential?: string | null
  source: string
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
}

const demolitionLabel: Record<string, string> = {
  none: "保留",
  partial: "部分拆除",
  full: "整体拆除",
  conditional: "有条件保留",
}

export default function AssessmentsPage() {
  const [rows, setRows] = useState<AssessmentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    setMessage("")
    try {
      const payload = await fetchAdminApi<{ data: AssessmentRow[] }>("/renovation/assessments")
      setRows(payload.data ?? [])
    } catch {
      setRows([])
      setMessage("建筑评估数据暂不可用。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const columns: Array<TableColumn<AssessmentRow>> = [
    { key: "node", label: "空间节点", render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
    { key: "assessedAt", label: "评估时间", render: (value) => new Date(String(value)).toLocaleString("zh-CN") },
    { key: "structuralScore", label: "结构" },
    { key: "safetyScore", label: "安全" },
    { key: "energyScore", label: "节能" },
    { key: "ecologicalScore", label: "生态" },
    {
      key: "demolitionRecommendation",
      label: "拆除建议",
      render: (value) => demolitionLabel[String(value)] ?? String(value ?? "-"),
    },
    { key: "reusePotential", label: "再利用", render: (value) => String(value ?? "-") },
  ]

  return (
    <AdminPageShell description="查看建筑结构、功能、节能、生态与拆除再利用评估记录。" eyebrow="空间改造" title="建筑评估">
      {message ? <AdminNotice tone="error">{message}</AdminNotice> : null}
      <AdminPanel>
        <AdminDataTable columns={columns} emptyLabel="暂无建筑评估记录。" isLoading={isLoading} rows={rows} />
      </AdminPanel>
    </AdminPageShell>
  )
}
