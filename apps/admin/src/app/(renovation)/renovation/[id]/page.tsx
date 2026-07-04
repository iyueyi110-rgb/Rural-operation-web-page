"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { AdminNotice, AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { RenovationStrategyMiniDiagram } from "@admin/components/renovation-spatial-diagram"
import { fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"

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
  return typeof value === "string" && value.trim() ? value : fallback
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
      setStrategy(payload.data)
    } catch {
      setStrategy(null)
      setMessage("改造策略详情暂不可用。")
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

  const materials = objectList(strategy.materials)
  const techniques = objectList(strategy.techniques)
  const energy = objectList(strategy.energyConstruction)
  const ecology = objectList(strategy.ecologicalMeasures)
  const programs = objectList(strategy.buildingProgram)
  const form = strategy.architecturalForm && typeof strategy.architecturalForm === "object" && !Array.isArray(strategy.architecturalForm)
    ? (strategy.architecturalForm as Record<string, unknown>)
    : {}

  return (
    <AdminPageShell
      description={`${nodeDisplayName(strategy.node?.slug, strategy.node?.nameKey)} / ${strategy.priority} / ${strategy.status}`}
      eyebrow="空间改造"
      title={strategy.title}
    >
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
