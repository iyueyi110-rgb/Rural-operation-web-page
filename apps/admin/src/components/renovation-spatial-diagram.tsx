"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Building2, Hammer, Leaf, MapPin, Route, Sparkles } from "lucide-react"

import {
  getDimensionLabel,
  getInterventionLabel,
  getRealmLabel,
  type RenovationDiagramNode,
  type RenovationStrategyLike,
} from "@admin/lib/renovation-diagram"
import { getRenovationDemoPhoto } from "@admin/lib/renovation-demo-data"

const realmOrder = ["ancient_road", "lychee_field", "resilience_valley", "ridge_dwelling", "unknown"]

export function RenovationSpatialDiagram({
  nodes,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: RenovationDiagramNode[]
  selectedNodeId?: string
  onSelectNode?: (nodeId: string) => void
}) {
  const selectedNode = nodes.find((node) => node.nodeId === selectedNodeId) ?? nodes[0]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink">空间改造示意图</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/54">节点 / 诊断 / 干预类型 / 预期效果</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LegendItem className="bg-moss" label="保留改造" />
          <LegendItem className="bg-clay" label="拆除重建" />
          <LegendItem className="bg-water" label="新建/生态" />
        </div>
      </div>

      {nodes.length ? (
        <div className="grid gap-3">
          {realmOrder.map((realm) => {
            const realmNodes = nodes.filter((node) => node.realm === realm)
            if (!realmNodes.length) return null

            return (
              <section className="rounded-lg border border-line bg-rice/70 p-3" key={realm}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-extrabold text-ink/70">{getRealmLabel(realm)}</div>
                  <div className="text-[11px] font-bold text-ink/42">{realmNodes.length} 个节点</div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {realmNodes.map((node) => {
                    const photo = getRenovationDemoPhoto(node.slug)
                    const photoUrl = node.photoUrl ?? photo?.url
                    const photoAlt = node.photoAlt ?? photo?.alt ?? "空间改造节点示意照片"

                    return (
                      <button
                        className={
                          selectedNodeId === node.nodeId
                            ? "group rounded-lg border border-water bg-white p-2 text-left shadow-soft outline outline-2 outline-water/15"
                            : "group rounded-lg border border-line bg-white p-2 text-left transition hover:border-water/50 hover:shadow-soft"
                        }
                        key={node.nodeId}
                        onClick={() => onSelectNode?.(node.nodeId)}
                        type="button"
                      >
                        <div
                          aria-label={photoAlt}
                          className="relative h-20 overflow-hidden rounded-md bg-rice bg-cover bg-center"
                          role="img"
                          style={{ backgroundImage: photoUrl ? `url(${photoUrl})` : undefined }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,32,27,0.04),rgba(25,32,27,0.58))]" />
                          <div className="absolute bottom-2 left-2">
                            <NodeMarker interventionType={node.interventionType} priority={node.priority} size="sm" />
                          </div>
                        </div>
                        <div className="mt-3 min-w-0 px-1">
                          <div className="truncate text-sm font-extrabold text-ink">{node.label}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Tag>{getInterventionLabel(node.interventionType)}</Tag>
                            <Tag>{node.priority}</Tag>
                            <Tag>{node.status}</Tag>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-1 text-[11px] font-bold text-ink/44">
                          <span>诊断</span>
                          <span className="h-px bg-line" />
                          <span>{node.strategyCount} 条策略</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-rice/70 p-6 text-sm font-semibold text-ink/54">
          暂无可绘制的空间改造节点。生成策略后将自动形成示意图。
        </div>
      )}

      <div className="rounded-lg border border-line bg-canopy p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <Route className="h-4 w-4" />
          当前节点链路
        </div>
        {selectedNode ? (
          <div className="mt-3 grid gap-2 text-xs font-semibold text-white/74">
            <FlowStep icon={<MapPin className="h-3.5 w-3.5" />} label="空间节点" value={selectedNode.label} />
            <FlowStep icon={<AlertTriangle className="h-3.5 w-3.5" />} label="优先级" value={selectedNode.priority} />
            <FlowStep icon={<Hammer className="h-3.5 w-3.5" />} label="干预类型" value={getInterventionLabel(selectedNode.interventionType)} />
            <FlowStep icon={<Sparkles className="h-3.5 w-3.5" />} label="策略数量" value={`${selectedNode.strategyCount} 条`} />
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold text-white/64">选择节点后查看诊断链路。</p>
        )}
      </div>
    </div>
  )
}

export function RenovationStrategyMiniDiagram({ strategy }: { strategy: RenovationStrategyLike & { oldNewRelationship?: string | null } }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-ink">单节点改造示意</h2>
          <p className="mt-1 text-sm leading-6 text-ink/58">现状、干预方式、新旧关系和预期效果的快速对照。</p>
        </div>
        <NodeMarker interventionType={strategy.interventionType ?? "renovation"} priority={strategy.priority} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <MiniStep icon={<Building2 className="h-4 w-4" />} label="现状节点" value={strategy.node?.nameKey ?? strategy.node?.slug ?? strategy.nodeId} />
        <Arrow />
        <MiniStep icon={<Hammer className="h-4 w-4" />} label="干预类型" value={getInterventionLabel(strategy.interventionType)} />
        <Arrow />
        <MiniStep icon={<Sparkles className="h-4 w-4" />} label="预期效果" value={strategy.expectedImpact ?? "待评估"} />
      </div>
      <div className="mt-4 rounded-lg bg-rice p-3 text-sm leading-6 text-ink/62">
        <span className="font-extrabold text-ink">新旧关系：</span>
        {strategy.oldNewRelationship ?? "暂无新旧关系描述。"}
      </div>
    </div>
  )
}

function NodeMarker({ interventionType, priority, size = "md" }: { interventionType: string; priority: string; size?: "sm" | "md" }) {
  const Icon = interventionType === "landscape_intervention" ? Leaf : interventionType === "new_construction" ? MapPin : Hammer
  const markerClass = markerTone(interventionType, priority)
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10"

  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-lg text-white shadow-soft ${markerClass}`}>
      <Icon className="h-4 w-4" />
    </span>
  )
}

function markerTone(interventionType: string, priority: string) {
  if (priority === "critical" || interventionType === "full_demolish_rebuild") return "bg-lychee"
  if (interventionType === "partial_demolish_rebuild") return "bg-clay"
  if (interventionType === "new_construction" || interventionType === "landscape_intervention") return "bg-water"
  return "bg-moss"
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink/58">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-rice px-2 py-0.5 text-[11px] font-bold text-ink/54">{children}</span>
}

function FlowStep({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/72">{icon}</span>
      <span className="text-white/45">{label}</span>
      <span className="min-w-0 truncate text-white">{value}</span>
    </div>
  )
}

function MiniStep({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-rice p-4">
      <div className="text-water">{icon}</div>
      <div className="mt-3 text-xs font-bold text-ink/42">{label}</div>
      <div className="mt-1 text-sm font-extrabold leading-5 text-ink">{value}</div>
    </div>
  )
}

function Arrow() {
  return <div className="hidden items-center px-1 text-lg font-extrabold text-water md:flex">→</div>
}
