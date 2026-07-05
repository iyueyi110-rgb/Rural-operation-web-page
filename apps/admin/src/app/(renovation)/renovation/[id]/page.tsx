"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { RenovationStrategyMiniDiagram } from "@admin/components/renovation-spatial-diagram"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"
import { getDemoRenovationStrategy, getRenovationDemoPhoto } from "@admin/lib/renovation-demo-data"

interface StrategyDetail {
  id: string
  nodeId: string
  title: string
  description: string
  category: string
  dimension: string
  interventionType?: string | null
  oldNewRelationship?: string | null
  materials: unknown
  techniques: unknown
  energyConstruction: unknown
  ecologicalMeasures: unknown
  architecturalForm: unknown
  buildingProgram: unknown
  estimatedDuration?: string | null
  difficultyLevel?: string | null
  estimatedCostRange?: string | null
  expectedImpact?: string | null
  priority: string
  status: string
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
  diagnosis?: { urgency?: string | null; aiSummary?: string | null; evidenceJson?: unknown } | null
}

function objectList(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : []
}

function text(value: unknown, fallback = "-") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return typeof value === "string" && value.trim() ? value : fallback
}

function getStrategyPhoto(strategy: StrategyDetail) {
  const slug = strategy.node?.slug ?? ""
  return getRenovationDemoPhoto(slug) ?? { url: "/images/renovation/hero-village.webp", alt: "空间改造示意照片" }
}

function hasRenderableField(row: Record<string, unknown>, fields: string[]) {
  return fields.some((field) => text(row[field], "").length > 0)
}

function sectionRows(value: unknown, fallback: unknown, fields: string[]) {
  const rows = objectList(value)
  if (rows.some((row) => hasRenderableField(row, fields))) return rows
  return objectList(fallback)
}

function formWithFallback(value: unknown, fallback: unknown) {
  const fields = ["formLanguage", "massingStrategy", "roofType", "elevationStrategy"]
  const current = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  if (hasRenderableField(current, fields)) return current
  return fallback && typeof fallback === "object" && !Array.isArray(fallback) ? (fallback as Record<string, unknown>) : {}
}

export default function RenovationDetailPage() {
  const params = useParams<{ id: string }>()
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")

  const loadStrategy = useCallback(async () => {
    setIsLoading(true)
    setMessage("")
    try {
      const payload = await fetchAdminApi<{ data: StrategyDetail }>(`/renovation/strategies/${params.id}`)
      setStrategy(payload.data ?? getDemoRenovationStrategy(params.id))
    } catch {
      setStrategy(getDemoRenovationStrategy(params.id))
      setMessage("后端详情暂不可用，已切换为空间改造降级演示。")
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void loadStrategy()
  }, [loadStrategy])

  if (isLoading) {
    return <AdminPageShell eyebrow="空间改造" title="改造策略详情"><AdminPanel>加载中...</AdminPanel></AdminPageShell>
  }

  if (!strategy) {
    return (
      <AdminPageShell eyebrow="空间改造" title="改造策略详情">
        <AdminNotice tone="error">{message || "未找到改造策略。"}</AdminNotice>
      </AdminPageShell>
    )
  }

  const demoStrategy = getDemoRenovationStrategy(strategy.id || strategy.node?.slug)
  const materials = sectionRows(strategy.materials, demoStrategy.materials, ["name", "category", "specification", "localAvailability"])
  const techniques = sectionRows(strategy.techniques, demoStrategy.techniques, ["name", "category", "description", "laborRequirement"])
  const energy = sectionRows(strategy.energyConstruction, demoStrategy.energyConstruction, ["type", "name", "description", "estimatedEnergySaving"])
  const ecology = sectionRows(strategy.ecologicalMeasures, demoStrategy.ecologicalMeasures, ["type", "name", "description", "expectedEcologicalBenefit"])
  const programs = sectionRows(strategy.buildingProgram, demoStrategy.buildingProgram, ["space", "area", "capacity", "requirements"])
  const form = formWithFallback(strategy.architecturalForm, demoStrategy.architecturalForm)
  const photo = getStrategyPhoto(strategy)

  return (
    <AdminPageShell
      description={`${nodeDisplayName(strategy.node?.slug, strategy.node?.nameKey)} / ${strategy.priority} / ${strategy.status}`}
      eyebrow="空间改造"
      title={strategy.title}
    >
      {message ? <AdminNotice>{message}</AdminNotice> : null}

      <AdminPanel className="overflow-hidden p-0">
        <div
          aria-label={photo.alt}
          className="relative min-h-[22rem] bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${photo.url})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,32,27,0.78),rgba(25,32,27,0.18)_55%,rgba(25,32,27,0.05))]" />
          <div className="absolute bottom-6 left-6 right-6 max-w-2xl text-white">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-bold text-white/78 backdrop-blur">
              空间改造示意照片
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-normal">{nodeDisplayName(strategy.node?.slug, strategy.node?.nameKey)}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
              {strategy.expectedImpact ?? strategy.oldNewRelationship ?? photo.alt}
            </p>
          </div>
        </div>
      </AdminPanel>

      <RenovationStrategyMiniDiagram strategy={strategy} />

      <AdminPanel>
        <div className="grid gap-3 text-sm text-ink/70 md:grid-cols-4">
          <Meta label="维度" value={strategy.dimension} />
          <Meta label="类型" value={strategy.interventionType ?? "-"} />
          <Meta label="工期" value={strategy.estimatedDuration ?? "-"} />
          <Meta label="造价" value={strategy.estimatedCostRange ?? "-"} />
        </div>
      </AdminPanel>

      <AdminPanel>
        <h2 className="text-base font-extrabold text-ink">诊断依据</h2>
        <p className="mt-2 text-sm leading-6 text-ink/64">{strategy.diagnosis?.aiSummary ?? "暂无 AI 诊断摘要。"}</p>
      </AdminPanel>

      <AdminPanel>
        <h2 className="text-base font-extrabold text-ink">改造描述</h2>
        <p className="mt-2 text-sm leading-6 text-ink/64">{strategy.description}</p>
        <p className="mt-3 text-sm leading-6 text-ink/64">{strategy.oldNewRelationship ?? "暂无新旧关系描述。"}</p>
      </AdminPanel>

      <Section title="推荐材质" rows={materials} fields={["name", "category", "specification", "localAvailability"]} />
      <Section title="施工手法" rows={techniques} fields={["name", "category", "description", "laborRequirement"]} />
      <Section title="节能构造" rows={energy} fields={["type", "name", "description", "estimatedEnergySaving"]} />
      <Section title="生态措施" rows={ecology} fields={["type", "name", "description", "expectedEcologicalBenefit"]} />

      <AdminPanel>
        <h2 className="text-base font-extrabold text-ink">建筑形式语言</h2>
        <div className="mt-3 grid gap-2 text-sm text-ink/64 md:grid-cols-2">
          <Meta label="形式" value={text(form.formLanguage)} />
          <Meta label="体量" value={text(form.massingStrategy)} />
          <Meta label="屋顶" value={text(form.roofType)} />
          <Meta label="立面" value={text(form.elevationStrategy)} />
        </div>
      </AdminPanel>

      <Section title="空间策划" rows={programs} fields={["space", "area", "capacity", "requirements"]} />

      <AdminPanel>
        <h2 className="text-base font-extrabold text-ink">预期效果</h2>
        <p className="mt-2 text-sm leading-6 text-ink/64">{strategy.expectedImpact ?? "暂无预期效果。"}</p>
      </AdminPanel>
    </AdminPageShell>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-ink/42">{label}</div>
      <div className="mt-1 font-bold text-ink">{value}</div>
    </div>
  )
}

function Section({ title, rows, fields }: { title: string; rows: Array<Record<string, unknown>>; fields: string[] }) {
  return (
    <AdminPanel>
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <div className="mt-3 grid gap-3">
        {rows.length ? rows.map((row, index) => (
          <div className="rounded-lg border border-line bg-rice p-3" key={`${title}-${index}`}>
            {fields.map((field) => (
              <div className="text-sm leading-6 text-ink/64" key={field}>
                <span className="font-bold text-ink/70">{field}: </span>
                {Array.isArray(row[field]) ? row[field].join(" / ") : String(row[field] ?? "-")}
              </div>
            ))}
          </div>
        )) : <p className="text-sm text-ink/54">暂无记录。</p>}
      </div>
    </AdminPanel>
  )
}
