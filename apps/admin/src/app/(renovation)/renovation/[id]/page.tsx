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

function getStrategyPhoto(strategy: StrategyDetail) {
  const slug = strategy.node?.slug ?? ""
  const photoBySlug: Record<string, { url: string; alt: string }> = {
    "ancient-road": { url: "/images/renovation/ai/ancient-road-energy-retrofit.jpg", alt: "古道驿站节能修缮示意照片" },
    "lychee-garden": { url: "/images/renovation/ai/lychee-workshop-reorganization.jpg", alt: "荔田工坊功能重组示意照片" },
    "waterfront-rest": { url: "/images/renovation/ai/waterfront-ecological-revetment.jpg", alt: "龙溪河岸生态护坡示意照片" },
    "ridge-courtyard": { url: "/images/renovation/ai/ridge-courtyard-energy-retrofit.jpg", alt: "岭上合院节能改造示意照片" },
    "village-meal": { url: "/images/renovation/ai/village-meal-granary.jpg", alt: "废弃粮仓部分拆除与新旧嵌合示意照片" },
    "tree-adoption": { url: "/images/renovation/ai/lychee-grove-service-station.jpg", alt: "荔枝林间空地轻量新建示意照片" },
  }

  return photoBySlug[slug] ?? { url: "/images/renovation/hero-village.webp", alt: "空间改造示意照片" }
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
  const photo = getStrategyPhoto(strategy)

  return (
    <AdminPageShell
      description={`${nodeDisplayName(strategy.node?.slug, strategy.node?.nameKey)} / ${strategy.priority} / ${strategy.status}`}
      eyebrow="空间改造"
      title={strategy.title}
    >
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
