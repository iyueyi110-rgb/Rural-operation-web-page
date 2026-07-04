import type { Metadata } from "next"
import {
  ArrowLeft,
  Building2,
  Clock3,
  Compass,
  Hammer,
  Landmark,
  MapPin,
  Route,
  ShieldAlert,
  Sparkles,
  Sprout,
  Zap,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BackButton } from "@web/components/back-button"
import {
  HeroMeta,
  InlineNotice,
  PanelTitle,
  SubpageHero,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import type { Locale } from "@web/i18n/routing"
import { DEMO_NODES } from "@web/lib/renovation-demo-data"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import type { RenovationPublicNode, RenovationPublicStrategy } from "@zouma/contracts"

export const dynamic = "force-static"

const priorityLabels: Record<RenovationPublicStrategy["priority"], string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
}

const urgencyLabels = {
  critical: "立即处置",
  high: "优先改造",
  medium: "纳入近期计划",
  low: "持续观察",
} as const

const interventionLabels: Record<string, string> = {
  renovation: "更新改造",
  partial_demolish_rebuild: "局部拆改",
  new_construction: "轻量新建",
  preserve: "保护保留",
  ecological_restoration: "生态修复",
}

const realmLabels: Record<string, string> = {
  ancient_road: "古道入口",
  lychee_field: "荔枝田园",
  resilience_valley: "韧性溪谷",
  ridge_dwelling: "岭上居住",
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const title = "空间改造公示 | 走马村云脑"
  const description = "走马村空间改造诊断、干预策略和新建选址潜力的公众展示。"

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: `/${params.locale}/renovation`,
    },
    openGraph: {
      title,
      description,
      images: ["/images/home/lychee-field.webp"],
    },
  }
}

function priorityTone(priority: RenovationPublicStrategy["priority"]) {
  if (priority === "critical") return "border-lychee/30 bg-lychee/10 text-lychee"
  if (priority === "high") return "border-amber-500/30 bg-amber-100 text-amber-800"
  if (priority === "medium") return "border-water/20 bg-water/10 text-water"
  return "border-line bg-rice text-ink/60"
}

function formatArea(node: RenovationPublicNode) {
  if (!node.building?.area) return "待测绘"
  return `${node.building.area}m²`
}

function getUrgencyLabel(node: RenovationPublicNode) {
  const urgency = node.diagnosis?.urgency
  return urgency && urgency in urgencyLabels ? urgencyLabels[urgency as keyof typeof urgencyLabels] : "待诊断"
}

function getInterventionLabel(strategy: RenovationPublicStrategy) {
  const type = strategy.interventionType
  return type ? interventionLabels[type] ?? type : "综合干预"
}

function getAverageEnergyScore(nodes: RenovationPublicNode[]) {
  const scores = nodes.flatMap((node) => (typeof node.building?.energyScore === "number" ? [node.building.energyScore] : []))
  if (scores.length === 0) return "N/A"
  return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
}

function RenovationDiagram({ nodes }: { nodes: RenovationPublicNode[] }) {
  const featuredNodes = nodes.slice(0, 5)

  return (
    <SurfacePanel className="overflow-hidden p-0">
      <div className="relative min-h-[25rem] bg-[#24332b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(144,188,125,0.28),transparent_32%),radial-gradient(circle_at_78%_34%,rgba(82,153,172,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0))]" />
        <div className="absolute inset-x-8 top-24 h-1 rounded-full bg-white/18" />
        <div className="absolute left-[18%] top-24 h-28 w-1 rotate-12 rounded-full bg-white/14" />
        <div className="absolute right-[22%] top-24 h-32 w-1 -rotate-12 rounded-full bg-white/14" />
        <div className="absolute bottom-6 left-6 right-6 top-6 rounded-xl border border-white/14 bg-white/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between rounded-t-xl border-b border-white/12 bg-ink/35 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-xs font-bold text-white/56">SPACE RENOVATION MAP</div>
            <div className="mt-1 text-lg font-extrabold">空间改造示意图</div>
          </div>
          <Compass aria-hidden="true" className="h-6 w-6 text-white/62" />
        </div>
        <div className="absolute inset-x-8 bottom-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {featuredNodes.map((node, index) => (
            <div
              className="min-h-[7rem] rounded-lg border border-white/14 bg-white/10 p-3 backdrop-blur"
              key={node.nodeId}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-extrabold text-ink">
                  {index + 1}
                </span>
                <span className="rounded-full border border-white/16 px-2 py-0.5 text-[0.68rem] font-bold text-white/70">
                  {getUrgencyLabel(node)}
                </span>
              </div>
              <div className="mt-3 text-sm font-extrabold leading-5">{node.nameKey}</div>
              <div className="mt-1 text-xs font-semibold text-white/58">
                {realmLabels[node.realm] ?? node.realm}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute left-[18%] top-[38%] grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-moss text-white shadow-lg">
          <Landmark aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="absolute left-[47%] top-[31%] grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-water text-white shadow-lg">
          <Hammer aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="absolute right-[18%] top-[42%] grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-lychee text-white shadow-lg">
          <Sparkles aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
    </SurfacePanel>
  )
}

export default async function RenovationPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const common = await getTranslations("common")
  const nodes = DEMO_NODES
  const strategyCount = nodes.reduce((sum, node) => sum + node.strategies.length, 0)
  const siteCount = nodes.reduce((sum, node) => sum + (node.sitePotentials?.length ?? 0), 0)

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backElement={
          <BackButton
            fallbackHref={`/${params.locale}`}
            label={common("back")}
          />
        }
        backHref={`/${params.locale}`}
        backLabel="返回首页"
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightElement={
          <VisitorHeaderActions
            locale={params.locale}
            rightLabel="空间改造公示"
          />
        }
      />

      <SubpageHero
        aside={<RenovationDiagram nodes={nodes} />}
        body="将建筑节能、拆改研判、功能重组和新建选址潜力统一呈现，公众可快速了解每个空间节点的诊断依据、干预类型、实施周期和预期效果。"
        eyebrow="Zouma Village Cloud Brain"
        icon={<Building2 aria-hidden="true" className="h-4 w-4" />}
        meta={
          <>
            <HeroMeta icon={<MapPin aria-hidden="true" className="h-3 w-3" />}>
              {nodes.length} 个空间节点
            </HeroMeta>
            <HeroMeta icon={<Hammer aria-hidden="true" className="h-3 w-3" />}>
              {strategyCount} 条改造策略
            </HeroMeta>
            <HeroMeta icon={<Sprout aria-hidden="true" className="h-3 w-3" />}>
              {siteCount} 个选址潜力点
            </HeroMeta>
          </>
        }
        title="村落空间改造公示"
      />

      <Section className="pt-8">
        <InlineNotice tone="warning">
          当前为演示数据模式；正式接入后将优先展示后端 /api/v1/renovation/public 返回的诊断结果。
        </InlineNotice>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SurfacePanel>
            <PanelTitle icon={<Building2 aria-hidden="true" className="h-4 w-4" />}>节点总数</PanelTitle>
            <div className="mt-3 text-3xl font-extrabold">{nodes.length}</div>
          </SurfacePanel>
          <SurfacePanel>
            <PanelTitle icon={<Hammer aria-hidden="true" className="h-4 w-4" />}>策略总数</PanelTitle>
            <div className="mt-3 text-3xl font-extrabold">{strategyCount}</div>
          </SurfacePanel>
          <SurfacePanel>
            <PanelTitle icon={<Zap aria-hidden="true" className="h-4 w-4" />}>平均节能评分</PanelTitle>
            <div className="mt-3 text-3xl font-extrabold">{getAverageEnergyScore(nodes)}</div>
          </SurfacePanel>
          <SurfacePanel>
            <PanelTitle icon={<Route aria-hidden="true" className="h-4 w-4" />}>选址潜力点</PanelTitle>
            <div className="mt-3 text-3xl font-extrabold">{siteCount}</div>
          </SurfacePanel>
        </div>
      </Section>

      <Section className="pt-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {nodes.map((node) => (
            <SurfacePanel className="flex min-h-full flex-col" key={node.nodeId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-2xl font-extrabold tracking-normal">{node.nameKey}</h2>
                    <span className="rounded-full border border-line bg-rice px-2.5 py-1 text-xs font-bold text-ink/58">
                      {realmLabels[node.realm] ?? node.realm}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink/52">
                    {node.building?.material ?? "待录入"} · {formatArea(node)} · {node.building?.age ?? 0} 年
                  </p>
                </div>
                <span className="rounded-full border border-water/20 bg-water/10 px-3 py-1 text-sm font-bold text-water">
                  {getUrgencyLabel(node)}
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-rice/65 p-4">
                <PanelTitle icon={<ShieldAlert aria-hidden="true" className="h-4 w-4" />} tone="lychee">
                  诊断摘要
                </PanelTitle>
                <p className="mt-3 text-sm leading-7 text-ink/66">
                  {node.diagnosis?.aiSummary ?? "暂无诊断摘要。"}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-rice p-3">
                  <div className="text-xs font-bold text-ink/45">结构状态</div>
                  <div className="mt-1 text-lg font-extrabold">{node.building?.structuralCondition ?? "N/A"}</div>
                </div>
                <div className="rounded-lg bg-rice p-3">
                  <div className="text-xs font-bold text-ink/45">节能评分</div>
                  <div className="mt-1 text-lg font-extrabold">{node.building?.energyScore ?? "N/A"}</div>
                </div>
                <div className="rounded-lg bg-rice p-3">
                  <div className="text-xs font-bold text-ink/45">策略数量</div>
                  <div className="mt-1 text-lg font-extrabold">{node.strategies.length}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {node.strategies.map((strategy) => (
                  <div className="rounded-lg border border-line bg-white/72 p-4" key={strategy.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="break-words text-base font-extrabold">{strategy.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityTone(strategy.priority)}`}>
                        {priorityLabels[strategy.priority]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/62">{strategy.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/54">
                      <span className="rounded-full bg-rice px-2.5 py-1">{getInterventionLabel(strategy)}</span>
                      <span className="rounded-full bg-rice px-2.5 py-1">{strategy.estimatedDuration ?? "周期待估"}</span>
                      <span className="rounded-full bg-rice px-2.5 py-1">{strategy.estimatedCostRange ?? "造价待估"}</span>
                    </div>
                    {strategy.expectedImpact ? (
                      <div className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-moss">
                        <Sparkles aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                        <span>{strategy.expectedImpact}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {node.sitePotentials?.length ? (
                <div className="mt-5 rounded-lg border border-moss/20 bg-moss/10 p-4">
                  <PanelTitle icon={<Sprout aria-hidden="true" className="h-4 w-4" />} tone="moss">
                    新建选址潜力
                  </PanelTitle>
                  <div className="mt-3 grid gap-3">
                    {node.sitePotentials.map((site) => (
                      <div className="rounded-lg bg-white/70 p-3" key={site.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-extrabold">{site.locationName}</div>
                          <div className="text-sm font-bold text-moss">{site.suitabilityScore} 分</div>
                        </div>
                        <div className="mt-1 text-sm text-ink/58">
                          {site.recommendedProgram} · {site.siteArea}m² · 生态影响 {site.ecologyImpactScore}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </SurfacePanel>
          ))}
        </div>
      </Section>

      <Section className="pt-8">
        <SurfacePanel tone="dark">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <PanelTitle icon={<Clock3 aria-hidden="true" className="h-4 w-4" />} tone="white">
                后端接入状态
              </PanelTitle>
              <h2 className="mt-3 text-2xl font-extrabold tracking-normal text-white">诊断、策略、评估将统一回写后端</h2>
              <p className="mt-3 text-sm leading-7 text-white/66">
                公示页只负责展示改造结果；正式数据由后端服务生成并通过 API 输出，缺数据时自动使用当前演示数据保持页面可用。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["规则诊断", "策略匹配", "影响评估"].map((item) => (
                <div className="rounded-lg border border-white/10 bg-white/8 p-4" key={item}>
                  <div className="text-sm font-extrabold text-white">{item}</div>
                  <div className="mt-2 text-xs font-semibold leading-5 text-white/56">服务层统一输出，页面消费结果。</div>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>
      </Section>
    </main>
  )
}
