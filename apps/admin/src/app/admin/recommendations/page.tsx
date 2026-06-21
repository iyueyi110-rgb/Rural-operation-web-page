"use client"

import { RefreshCw, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import {
  RecommendationReviewPanel,
  type RecommendationRow,
} from "@admin/components/recommendation-review-panel"
import { fetchAdminApi } from "@admin/lib/admin-api"

type RecommendationStatus = "draft" | "approved" | "executed"

const tabs: Array<{ value: RecommendationStatus; label: string }> = [
  { value: "draft", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "executed", label: "已执行" },
]

export default function RecommendationsPage() {
  const [status, setStatus] = useState<RecommendationStatus>("draft")
  const [items, setItems] = useState<RecommendationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await fetchAdminApi<{ data: RecommendationRow[] }>(
        `/recommendations?status=${status}`,
      )
      setItems(result.data)
    } catch {
      setError("智策卡加载失败，请确认前台 API 已启动。")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  return (
    <div className="-m-4 min-h-screen bg-[#0b1411] p-4 text-white sm:-m-6 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Decision Center
          </div>
          <h1 className="mt-2 text-3xl font-extrabold">智策中心</h1>
          <p className="mt-2 text-sm text-white/50">
            按 Evidence、Action、Impact
            审核建议，执行动作仅允许访问系统内部白名单接口。
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/5 px-4 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-45"
          disabled={loading}
          onClick={loadItems}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </button>
      </header>

      <div aria-label="智策卡状态" className="mt-6 flex gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={status === tab.value}
            className={
              status === tab.value
                ? "rounded-full bg-emerald-300 px-4 py-2 text-sm font-extrabold text-[#102019]"
                : "rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white/55 transition hover:text-white"
            }
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-xl bg-[#14211d] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
        {error ? (
          <p className="mb-4 rounded-md bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}
        {loading && !items.length ? (
          <p className="text-sm font-semibold text-white/45">
            正在加载智策卡...
          </p>
        ) : (
          <RecommendationReviewPanel
            emptyLabel={`暂无${tabs.find((tab) => tab.value === status)?.label ?? ""}智策卡。`}
            items={items}
            onReviewed={loadItems}
          />
        )}
      </section>
    </div>
  )
}
