"use client"

import { Check, Lightbulb, X } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"

import { fetchAdminApi } from "@admin/lib/admin-api"
import { formatEvidenceEntries } from "@admin/lib/dashboard-data"

export interface RecommendationRow {
  id: string
  bizDate: string
  type: string
  targetObject?: string | null
  evidenceJson: unknown
  message: string
  actionSteps: unknown
  ownerRole: string
  expectedImpact?: string | null
  confidence: number
  status: string
}

interface RecommendationReviewPanelProps {
  items: RecommendationRow[]
  onReviewed?: () => void
  emptyLabel?: string
}

export function RecommendationReviewPanel({
  items,
  onReviewed,
  emptyLabel = "暂无待审核智策卡。",
}: RecommendationReviewPanelProps) {
  const [busyId, setBusyId] = useState("")
  const [message, setMessage] = useState("")

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id)
    setMessage("")

    try {
      await fetchAdminApi(`/recommendations/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, approvedBy: "运营后台" }),
      })
      setMessage(action === "approve" ? "智策卡已审核通过。" : "智策卡已驳回。")
      onReviewed?.()
    } catch {
      setMessage("审核操作失败，请稍后重试。")
    } finally {
      setBusyId("")
    }
  }

  if (!items.length) {
    return (
      <div className="grid gap-2">
        <p
          aria-live="polite"
          className="text-xs font-semibold text-emerald-300"
        >
          {message}
        </p>
        <p className="text-sm font-semibold text-white/45">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p
        aria-live="polite"
        className="min-h-5 text-xs font-semibold text-emerald-300"
      >
        {message}
      </p>

      {items.map((item) => {
        const evidence = formatEvidenceEntries(item.evidenceJson)
        const actions = readActionSteps(item.actionSteps)

        return (
          <article className="rounded-lg bg-black/15 p-4" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">
                  <Lightbulb aria-hidden="true" className="h-3.5 w-3.5" />
                  {recommendationTypeLabel(item.type)}
                </div>
                <h3 className="mt-2 text-base font-extrabold text-white">
                  {item.message}
                </h3>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
                {Math.round(item.confidence * 100)}% 置信度
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <Triad title="Evidence / 依据">
                {evidence.length ? (
                  <dl className="grid gap-1.5">
                    {evidence.slice(0, 5).map((entry) => (
                      <div
                        className="flex justify-between gap-3"
                        key={entry.label}
                      >
                        <dt className="truncate text-white/45">
                          {entry.label}
                        </dt>
                        <dd className="text-right font-bold text-white/80">
                          {entry.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <span className="text-white/40">暂无结构化指标</span>
                )}
              </Triad>

              <Triad title="Action / 行动">
                <ol className="grid gap-1.5">
                  {actions.length ? (
                    actions.slice(0, 4).map((action, index) => (
                      <li className="flex gap-2" key={`${item.id}-${index}`}>
                        <span className="text-orange-300">{index + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/40">等待补充行动步骤</li>
                  )}
                </ol>
              </Triad>

              <Triad title="Impact / 影响">
                <p>{item.expectedImpact || "等待执行后评估影响。"}</p>
                <p className="mt-3 text-white/45">责任角色：{item.ownerRole}</p>
              </Triad>
            </div>

            {item.status === "draft" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-300 px-4 text-sm font-extrabold text-[#102019] transition hover:bg-emerald-200 disabled:opacity-45"
                  disabled={busyId === item.id}
                  onClick={() => review(item.id, "approve")}
                  type="button"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  审核通过
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/5 px-4 text-sm font-bold text-white/70 transition hover:bg-red-400/15 hover:text-red-200 disabled:opacity-45"
                  disabled={busyId === item.id}
                  onClick={() => review(item.id, "reject")}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  驳回
                </button>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function Triad({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white/[0.035] p-3 text-xs leading-5 text-white/65">
      <h4 className="mb-2 font-extrabold text-white/85">{title}</h4>
      {children}
    </section>
  )
}

function readActionSteps(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map((entry) => {
    if (typeof entry === "string") return entry
    if (typeof entry !== "object" || entry === null) return String(entry)
    const record = entry as Record<string, unknown>
    return String(
      record.action ?? record.title ?? record.description ?? "执行建议动作",
    )
  })
}

function recommendationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    weather_plan: "气象计划",
    crowd_diversion: "客流疏导",
    inventory_alert: "库存提醒",
    maintenance: "设施维护",
  }
  return labels[type] ?? type
}
