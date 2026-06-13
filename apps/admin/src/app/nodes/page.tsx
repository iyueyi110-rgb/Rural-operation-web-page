"use client"

import { useEffect, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface SpaceNodeRow extends Record<string, unknown> {
  id: string
  slug: string
  nameKey: string
  realm: string
  nodeType: string
  capacity: number
  terrainRisk: number
  watersideRisk: number
}

interface ScoreRow {
  id: string
  date: string
  attractiveness: number
  safetyRisk: number
  totalVisitors: number
  avgDwellMin: number
}

const columns: Array<TableColumn<SpaceNodeRow>> = [
  { key: "slug", label: "节点", render: (_value, row) => nodeDisplayName(row.slug, row.nameKey) },
  { key: "realm", label: "四境" },
  { key: "nodeType", label: "类型" },
  { key: "capacity", label: "容量" },
  { key: "terrainRisk", label: "地形" },
  { key: "watersideRisk", label: "近水" },
]

export default function NodesPage() {
  const [nodes, setNodes] = useState<SpaceNodeRow[]>([])
  const [selected, setSelected] = useState<SpaceNodeRow | null>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadNodes() {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${adminApiBase}/nodes`)
      if (!response.ok) throw new Error(adminCopy.common.error)
      const result = (await response.json()) as { data: SpaceNodeRow[] }
      setNodes(result.data)
      setSelected((current) => current ?? result.data[0] ?? null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadScores(node: SpaceNodeRow | null) {
    if (!node) return

    try {
      const response = await fetch(`${adminApiBase}/nodes/scores/${node.slug}`)
      if (!response.ok) throw new Error(adminCopy.common.error)
      const result = (await response.json()) as { data: ScoreRow[] }
      setScores(result.data)
    } catch {
      setScores([])
    }
  }

  useEffect(() => {
    void loadNodes()
  }, [])

  useEffect(() => {
    void loadScores(selected)
  }, [selected])

  const currentScore = scores[0]

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.nodes.title}</h1>
      </header>

      {error ? <div className="rounded-md bg-lychee/10 p-3 text-sm font-bold text-lychee">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminDataTable
          columns={columns}
          emptyLabel={adminCopy.nodes.noData}
          isLoading={isLoading}
          onRowClick={(row) => setSelected(row)}
          rows={nodes}
          selectedId={selected?.id}
        />

        <aside className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          {selected ? (
            <div>
              <p className="text-sm font-bold text-water">{adminCopy.nodes.detail}</p>
              <h2 className="mt-1 text-xl font-extrabold">{nodeDisplayName(selected.slug, selected.nameKey)}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <AdminStatCard label={adminCopy.nodes.attractiveness} value={currentScore?.attractiveness ?? "—"} />
                <AdminStatCard label={adminCopy.nodes.safetyRisk} value={currentScore?.safetyRisk ?? "—"} />
                <AdminStatCard label={adminCopy.nodes.visitors} value={currentScore?.totalVisitors ?? "—"} />
                <AdminStatCard label={adminCopy.nodes.avgDwell} value={currentScore?.avgDwellMin ?? "—"} />
              </div>
              <div className="mt-4 rounded-md bg-rice p-3 text-sm font-semibold leading-6 text-ink/64">
                近 {scores.length} 条评分记录。当前容量 {selected.capacity} 人，地形风险 {selected.terrainRisk}，近水风险 {selected.watersideRisk}。
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/54">{adminCopy.common.noSelection}</p>
          )}
        </aside>
      </div>
    </div>
  )
}
