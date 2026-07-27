"use client"

import { AlertTriangle, Layers, MapPinned, RefreshCw, ShoppingCart, Users } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"

import type { AdminMapProps, MapLayer, MapNode, MapNodeMetric } from "@admin/components/admin-map"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, fetchWithTimeout } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"
import { zoumaVillageLabel } from "@admin/lib/map-location"

const AdminMap = dynamic<AdminMapProps>(() => import("@admin/components/admin-map").then((mod) => mod.AdminMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-lg border border-stone bg-white text-sm font-bold text-ink/54">
      {adminCopy.common.loading}
    </div>
  ),
})

interface NodeScore {
  nodeId: string
  attractiveness: number
  safetyRisk: number
}

interface CrossRow {
  nodeId: string
  revenue: number
  orderCount: number
}

interface PresenceRow {
  node: { id: string }
  latest: {
    peopleCount: number
    timestamp: string
  } | null
}

const layerOptions: Array<{ key: MapLayer; label: string }> = [
  { key: "heat", label: adminCopy.map.heatLayer },
  { key: "risk", label: adminCopy.map.riskLayer },
  { key: "spend", label: adminCopy.map.spendLayer },
]

export default function MapPage() {
  const [activeLayer, setActiveLayer] = useState<MapLayer>("heat")
  const [nodes, setNodes] = useState<MapNode[]>([])
  const [scores, setScores] = useState<NodeScore[]>([])
  const [crossRows, setCrossRows] = useState<CrossRow[]>([])
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadMapData() {
    setIsLoading(true)
    setError("")

    try {
      const date = today()
      const [nodesResult, scoresResult, crossResult, presenceResult] = await Promise.all([
        fetchWithTimeout(`${adminApiBase}/nodes`).then((response) => response.json()) as Promise<{ data: MapNode[] }>,
        fetchWithTimeout(`${adminApiBase}/nodes/scores?date=${date}`).then((response) => response.json()) as Promise<{ data: NodeScore[] }>,
        fetchWithTimeout(`${adminApiBase}/analytics/cross/flow-vs-spend?date=${date}`).then((response) => response.json()) as Promise<{ data: CrossRow[] }>,
        fetchWithTimeout(`${adminApiBase}/presence?latest=true`).then((response) => response.json()) as Promise<{ data: PresenceRow[] }>,
      ])

      setNodes(nodesResult.data)
      setScores(scoresResult.data)
      setCrossRows(crossResult.data)
      setPresenceRows(presenceResult.data)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMapData()
  }, [])

  const metrics = useMemo(() => {
    const result = new Map<string, MapNodeMetric>()

    for (const node of nodes) {
      result.set(node.id, {
        nodeId: node.id,
        currentVisitors: 0,
        updatedAt: null,
        attractiveness: 0,
        safetyRisk: 0,
        revenue: 0,
        orderCount: 0,
      })
    }

    for (const score of scores) {
      const current = result.get(score.nodeId)
      if (current) {
        current.attractiveness = score.attractiveness
        current.safetyRisk = score.safetyRisk
      }
    }

    for (const row of crossRows) {
      const current = result.get(row.nodeId)
      if (current) {
        current.revenue = row.revenue
        current.orderCount = row.orderCount
      }
    }

    for (const row of presenceRows) {
      const current = result.get(row.node.id)
      if (current && row.latest) {
        current.currentVisitors = row.latest.peopleCount
        current.updatedAt = new Date(row.latest.timestamp).toLocaleString("zh-CN", { hour12: false })
      }
    }

    return result
  }, [crossRows, nodes, presenceRows, scores])

  const summary = useMemo(() => {
    const values = Array.from(metrics.values())
    return {
      activeNodes: values.filter((item) => item.currentVisitors > 0).length,
      visitors: values.reduce((sum, item) => sum + item.currentVisitors, 0),
      highRisk: values.filter((item) => item.safetyRisk >= 70).length,
      revenue: values.reduce((sum, item) => sum + item.revenue, 0),
    }
  }, [metrics])

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.map.subtitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.map.title}</h1>
          <p className="mt-1 text-xs font-semibold text-ink/54">{zoumaVillageLabel}</p>
        </div>
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-water disabled:opacity-50"
          disabled={isLoading}
          onClick={loadMapData}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {adminCopy.common.refresh}
        </button>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-lychee/15 bg-lychee/10 px-4 py-3 text-sm font-semibold text-lychee">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard icon={<MapPinned className="h-4 w-4" />} label={adminCopy.map.activeNodes} value={isLoading ? "..." : summary.activeNodes} />
        <AdminStatCard icon={<Users className="h-4 w-4" />} label={adminCopy.map.latestVisitors} value={isLoading ? "..." : summary.visitors} />
        <AdminStatCard icon={<AlertTriangle className="h-4 w-4" />} label={adminCopy.map.highRisk} value={isLoading ? "..." : summary.highRisk} />
        <AdminStatCard icon={<ShoppingCart className="h-4 w-4" />} label={adminCopy.map.totalRevenue} value={isLoading ? "..." : `¥${summary.revenue.toFixed(0)}`} />
      </div>

      <section className="grid gap-4 rounded-xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Layers className="h-4 w-4 text-water" />
            {adminCopy.map.layer}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-full bg-rice p-1">
            {layerOptions.map((item) => (
              <button
                className={
                  activeLayer === item.key
                    ? "rounded-full bg-canopy px-3 py-2 text-xs font-bold text-white"
                    : "rounded-full px-3 py-2 text-xs font-bold text-ink/58 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-water"
                }
                key={item.key}
                onClick={() => setActiveLayer(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <AdminMap activeLayer={activeLayer} metrics={metrics} nodes={nodes} />
      </section>
    </div>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}
