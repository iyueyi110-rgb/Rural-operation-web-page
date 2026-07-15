"use client"

import { useCallback, useEffect, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"
import { demoBuildingAssessments, getRenovationDemoPhoto } from "@admin/lib/renovation-demo-data"

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
  photo?: string
  demolitionRecommendation?: string | null
  reusePotential?: string | null
  source: string
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
}

function applyAssessmentFallback(rows: AssessmentRow[]) {
  return rows.length > 0 ? rows : demoBuildingAssessments
}

function AssessmentPhotoThumb({ row }: { row: AssessmentRow }) {
  const photo = getRenovationDemoPhoto(row.node?.slug)
  return (
    <div
      aria-label={photo?.alt ?? "建筑评估示意照片"}
      className="h-10 w-16 rounded-md bg-rice bg-cover bg-center"
      role="img"
      style={{ backgroundImage: photo ? `url(${photo.url})` : undefined }}
    />
  )
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
  const [messageTone, setMessageTone] = useState<"error" | "neutral">("error")

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    setMessage("")
    try {
      const payload = await fetchAdminApi<{ data: AssessmentRow[] }>("/renovation/assessments")
      const nextRows = applyAssessmentFallback(payload.data ?? [])
      setRows(nextRows)
      if (!payload.data?.length) {
        setMessageTone("neutral")
        setMessage("后端暂无建筑评估记录，已展示降级演示数据。")
      }
    } catch {
      setRows(demoBuildingAssessments)
      setMessageTone("neutral")
      setMessage("建筑评估数据暂不可用，已切换为降级演示数据。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const columns: Array<TableColumn<AssessmentRow>> = [
    { key: "photo", label: "示意", render: (_value, row) => <AssessmentPhotoThumb row={row} /> },
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
      {message ? <AdminNotice tone={messageTone}>{message}</AdminNotice> : null}
      <AdminPanel>
        <AdminDataTable columns={columns} emptyLabel="暂无建筑评估记录。" isLoading={isLoading} rows={rows} />
      </AdminPanel>
    </AdminPageShell>
  )
}
