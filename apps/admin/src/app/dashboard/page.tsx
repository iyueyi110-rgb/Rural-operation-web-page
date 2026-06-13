"use client"

import { AlertTriangle, BarChart3, FileText, RefreshCw, ShoppingCart, Star, Users } from "lucide-react"
import { useEffect, useState } from "react"

import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface FeedbackRecord {
  rating: number
}

interface OrderResponse {
  meta: { total: number; totalAmount: number }
}

interface LatestPresenceItem {
  latest: { peopleCount: number } | null
}

interface ScoreItem {
  attractiveness: number
  safetyRisk: number
  weatherCondition?: string | null
  node: { slug: string; nameKey: string }
}

interface DailyReport {
  summary: string
  actionItems: Array<{ priority: string; action: string }>
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderResponse["meta"] | null>(null)
  const [visitorCount, setVisitorCount] = useState(0)
  const [avgRating, setAvgRating] = useState("0.0")
  const [scores, setScores] = useState<ScoreItem[]>([])
  const [latestReport, setLatestReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  async function loadDashboard() {
    setIsLoading(true)
    setError("")

    try {
      const [ordersResult, presenceResult, feedbackResult, scoresResult, reportResult] = await Promise.allSettled([
        fetch(`${adminApiBase}/orders?date=${today()}`).then((res) => res.json()) as Promise<OrderResponse>,
        fetch(`${adminApiBase}/presence?latest=true`).then((res) => res.json()) as Promise<{ data: LatestPresenceItem[] }>,
        fetch(`${adminApiBase}/feedback`).then((res) => res.json()) as Promise<{ data: FeedbackRecord[] }>,
        fetch(`${adminApiBase}/nodes/scores?date=${today()}`).then((res) => res.json()) as Promise<{ data: ScoreItem[] }>,
        fetch(`${adminApiBase}/reports/latest`).then((res) => res.json()) as Promise<{ data: DailyReport | null }>,
      ])

      if (ordersResult.status === "fulfilled") setOrders(ordersResult.value.meta)
      if (presenceResult.status === "fulfilled") {
        setVisitorCount(
          presenceResult.value.data.reduce((sum, item) => sum + (item.latest?.peopleCount ?? 0), 0),
        )
      }
      if (feedbackResult.status === "fulfilled") {
        const feedback = feedbackResult.value.data
        const average = feedback.length
          ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
          : 0
        setAvgRating(average.toFixed(1))
      }
      if (scoresResult.status === "fulfilled") setScores(scoresResult.value.data)
      if (reportResult.status === "fulfilled") setLatestReport(reportResult.value.data)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  async function generateReport() {
    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch(`${adminApiBase}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today() }),
      })

      if (!response.ok) throw new Error(adminCopy.common.error)
      await loadDashboard()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const topScores = scores.slice(0, 5)
  const alerts = scores.filter((score) => score.safetyRisk > 70)

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.dashboard.title}</h1>
      </header>

      {error ? <ErrorLine message={error} /> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard icon={<Users className="h-4 w-4" />} label={adminCopy.dashboard.visitors} value={isLoading ? "..." : visitorCount} />
        <AdminStatCard icon={<ShoppingCart className="h-4 w-4" />} label={adminCopy.dashboard.orders} value={isLoading ? "..." : (orders?.total ?? 0)} />
        <AdminStatCard icon={<BarChart3 className="h-4 w-4" />} label={adminCopy.dashboard.revenue} value={isLoading ? "..." : `¥${orders?.totalAmount ?? 0}`} />
        <AdminStatCard icon={<Star className="h-4 w-4" />} label={adminCopy.dashboard.satisfaction} value={isLoading ? "..." : avgRating} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">{adminCopy.dashboard.latestReport}</h2>
            <button
              className="flex h-9 items-center gap-2 rounded-full border border-stone px-4 text-sm font-bold disabled:opacity-50"
              disabled={isGenerating}
              onClick={generateReport}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? adminCopy.reports.generating : adminCopy.dashboard.generateReport}
            </button>
          </div>
          {latestReport ? (
            <div className="mt-4">
              <p className="text-sm leading-7 text-ink/66">{latestReport.summary}</p>
              <div className="mt-4 grid gap-2">
                {latestReport.actionItems.slice(0, 3).map((item) => (
                  <div className="rounded-md bg-rice px-3 py-2 text-sm font-semibold text-ink/70" key={item.action}>
                    {item.priority} / {item.action}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-ink/54">{adminCopy.reports.noData}</p>
          )}
        </div>

        <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <h2 className="text-lg font-extrabold">{adminCopy.dashboard.activeAlerts}</h2>
          <div className="mt-4 grid gap-3">
            {alerts.length ? alerts.map((score) => (
              <div className="rounded-md border border-lychee/20 bg-lychee/5 p-3" key={score.node.slug}>
                <div className="text-sm font-extrabold text-lychee">{nodeDisplayName(score.node.slug, score.node.nameKey)}</div>
                <div className="mt-1 text-xs font-semibold text-ink/58">风险分 {score.safetyRisk} / 建议现场复核承载与近水风险</div>
              </div>
            )) : <p className="text-sm font-semibold text-ink/54">暂无活跃告警。</p>}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">{adminCopy.dashboard.hotNodes}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {topScores.length ? topScores.map((score, index) => (
            <div className="rounded-md bg-rice p-3" key={score.node.slug}>
              <div className="text-xs font-bold text-water">#{index + 1}</div>
              <div className="mt-1 truncate text-sm font-extrabold">{nodeDisplayName(score.node.slug, score.node.nameKey)}</div>
              <div className="mt-2 text-xs font-semibold text-ink/58">吸引力 {score.attractiveness}</div>
              <div className={`text-xs font-semibold ${riskTone(score.safetyRisk)}`}>风险 {score.safetyRisk}</div>
            </div>
          )) : <p className="text-sm font-semibold text-ink/54">{adminCopy.dashboard.noData}</p>}
        </div>
      </section>
    </div>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}

function riskTone(value: number) {
  if (value > 70) return "text-lychee"
  if (value >= 30) return "text-yellow-500"
  return "text-moss"
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-lychee/10 px-4 py-3 text-sm font-semibold text-lychee">
      <AlertTriangle className="h-4 w-4" />
      {message}
    </div>
  )
}
