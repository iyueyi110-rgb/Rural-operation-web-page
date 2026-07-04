import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ArrowLeft, Building2, Clock, Coins, Leaf, MapPin, ShieldCheck } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

import { BackButton } from "@web/components/back-button"
import { HeroMeta, InlineNotice, PanelTitle, SubpageHero, SurfacePanel } from "@web/components/subpage-ui"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import type { Locale } from "@web/i18n/routing"
import { renovationDemoNodes } from "@web/lib/renovation-demo-data"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import type { RenovationPublicNode } from "@zouma/contracts"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return {
    metadataBase: getSiteUrl(),
    title: "建筑空间改造公示",
    description: "走马村云脑系统生成的建筑空间诊断、改造策略和选址建议。",
    openGraph: {
      title: "建筑空间改造公示",
      description: "走马村云脑系统生成的建筑空间诊断、改造策略和选址建议。",
      images: ["/images/home/ridge-courtyard.webp"],
    },
  }
}

async function fetchRenovationNodes(): Promise<{ nodes: RenovationPublicNode[]; degraded: boolean }> {
  const url = new URL("/api/v1/renovation/public", getSiteUrl())

  try {
    const response = await fetch(url, { cache: "no-store" })
    const payload = (await response.json()) as { data?: RenovationPublicNode[] } | null
    const nodes = Array.isArray(payload?.data) ? payload.data : []
    return nodes.length > 0 ? { nodes, degraded: false } : { nodes: renovationDemoNodes, degraded: true }
  } catch {
    return { nodes: renovationDemoNodes, degraded: true }
  }
}

export default async function RenovationPublicPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const { nodes, degraded } = await fetchRenovationNodes()

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backElement={<BackButton fallbackHref={`/${params.locale}`} label="返回" />}
        backHref={`/${params.locale}`}
        backLabel="返回首页"
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightElement={<VisitorHeaderActions locale={params.locale} rightLabel="空间改造" />}
      />

      <SubpageHero
        aside={
          <SurfacePanel className="overflow-hidden p-0">
            <div className="relative min-h-72 bg-ink text-white">
              <div className="absolute inset-0 bg-[url('/images/home/ridge-courtyard.webp')] bg-cover bg-center opacity-85" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,32,27,0.04),rgba(25,32,27,0.82))]" />
              <div className="absolute bottom-5 left-5 right-5">
                <PanelTitle icon={<Building2 aria-hidden="true" className="h-4 w-4" />} tone="white">
                  建筑空间改造策略
                </PanelTitle>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/78">
                  数据采集、空间诊断、改造策略生成与效果评估组成闭环，优先服务节能降碳、空间优化和生态治理。
                </p>
              </div>
            </div>
          </SurfacePanel>
        }
        body="这里公示云脑系统生成的建筑节点诊断和改造建议。AI 只负责增强表达，核心判断来自规则引擎、评估记录、客流、反馈与传感器证据。"
        eyebrow="走马村云脑"
        icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
        meta={
          <>
            <HeroMeta icon={<Building2 aria-hidden="true" className="h-3 w-3" />}>{nodes.length} 个节点</HeroMeta>
            <HeroMeta icon={<Leaf aria-hidden="true" className="h-3 w-3" />}>节能 / 空间 / 生态</HeroMeta>
            <HeroMeta icon={<MapPin aria-hidden="true" className="h-3 w-3" />}>含拆除与新建决策</HeroMeta>
          </>
        }
        title="建筑空间改造公示"
      />

      <Section className="pt-8">
        {degraded ? (
          <InlineNotice tone="warning">当前暂无可公示的后端改造数据，页面正在展示降级演示节点。</InlineNotice>
        ) : null}
        <div className="mt-5 grid gap-5">
          {nodes.map((node) => (
            <RenovationNodeCard key={node.nodeId} node={node} />
          ))}
        </div>
      </Section>
    </main>
  )
}

function RenovationNodeCard({ node }: { node: RenovationPublicNode }) {
  const building = node.building
  const evidence = node.diagnosis?.evidenceJson

  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-[0_12px_28px_rgba(25,32,27,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-normal text-water">{node.realm}</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-normal text-ink">{node.nameKey}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/62">{node.diagnosis?.aiSummary ?? "暂无诊断摘要。"}</p>
        </div>
        <span className="rounded-full border border-line bg-rice px-3 py-1 text-xs font-bold text-ink/58">
          {node.diagnosis?.urgency ?? "draft"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric icon={<Building2 className="h-4 w-4" />} label="建筑" value={`${building?.material ?? "-"} / ${building?.area ?? "-"}m²`} />
        <Metric icon={<Clock className="h-4 w-4" />} label="建龄" value={building?.age ? `${building.age} 年` : "-"} />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label="安全" value={String(evidence?.safetyScore ?? "-")} />
        <Metric icon={<Leaf className="h-4 w-4" />} label="节能" value={String(building?.energyScore ?? evidence?.energyScore ?? "-")} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(260px,0.28fr)]">
        <div className="grid gap-3">
          {node.strategies.slice(0, 2).map((strategy) => (
            <div className="rounded-lg border border-line bg-rice/70 p-4" key={strategy.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-moss px-2.5 py-1 text-xs font-bold text-white">{strategy.dimension}</span>
                <span className="rounded-full bg-ink/8 px-2.5 py-1 text-xs font-bold text-ink/62">{strategy.interventionType ?? "renovation"}</span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-ink">{strategy.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/62">{strategy.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/54">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{strategy.estimatedDuration ?? "待评估"}</span>
                <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" />{strategy.estimatedCostRange ?? "待估算"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-sm font-extrabold text-ink">选址与补充建设</div>
          <div className="mt-3 grid gap-3">
            {node.sitePotentials?.length ? node.sitePotentials.map((site) => (
              <div className="rounded-lg bg-rice p-3" key={site.id}>
                <div className="text-sm font-bold text-ink">{site.locationName}</div>
                <div className="mt-1 text-xs font-semibold text-ink/54">适宜度 {site.suitabilityScore} / {site.recommendedProgram ?? "待定"}</div>
              </div>
            )) : <p className="text-sm leading-6 text-ink/54">当前节点暂无新建选址建议。</p>}
          </div>
        </div>
      </div>
    </article>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-rice p-4">
      <div className="text-water">{icon}</div>
      <div className="mt-2 break-words text-lg font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-xs font-semibold text-ink/54">{label}</div>
    </div>
  )
}
