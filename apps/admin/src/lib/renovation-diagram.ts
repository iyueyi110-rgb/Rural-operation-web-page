export type RenovationStrategyLike = {
  id: string
  nodeId: string
  title: string
  priority: string
  status: string
  interventionType?: string | null
  dimension?: string | null
  expectedImpact?: string | null
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
}

export type RenovationDiagramNode = {
  nodeId: string
  label: string
  slug?: string
  realm: string
  priority: string
  status: string
  interventionType: string
  dimension?: string
  strategyCount: number
  strategies: RenovationStrategyLike[]
}

export const realmLabels: Record<string, string> = {
  ancient_road: "古道叙事境",
  lychee_field: "荔田共生境",
  resilience_valley: "韧谷研学境",
  ridge_dwelling: "岭上共居境",
  unknown: "未分区节点",
}

export const dimensionLabels: Record<string, string> = {
  energy: "节能",
  spatial: "空间",
  ecological: "生态",
}

export const interventionLabels: Record<string, string> = {
  renovation: "保留改造",
  partial_demolish_rebuild: "部分拆除",
  full_demolish_rebuild: "拆除重建",
  new_construction: "新建选址",
  extension: "扩建",
  adaptive_reuse: "功能置换",
  landscape_intervention: "景观生态",
}

const realmOrder = ["ancient_road", "lychee_field", "resilience_valley", "ridge_dwelling", "unknown"]
const priorityRank: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
  critical: 5,
}
const statusRank: Record<string, number> = {
  draft: 1,
  proposed: 2,
  approved: 3,
  in_progress: 4,
  completed: 5,
  verified: 6,
}

export function getInterventionLabel(value?: string | null) {
  if (!value) return "未分类"
  return interventionLabels[value] ?? value
}

export function getDimensionLabel(value?: string | null) {
  if (!value) return "未分类"
  return dimensionLabels[value] ?? value
}

export function getRealmLabel(value?: string | null) {
  if (!value) return realmLabels.unknown
  return realmLabels[value] ?? value
}

export function buildRenovationDiagramNodes(strategies: RenovationStrategyLike[]): RenovationDiagramNode[] {
  const grouped = new Map<string, RenovationDiagramNode>()

  for (const strategy of strategies) {
    const existing = grouped.get(strategy.nodeId)
    const realm = strategy.node?.realm?.trim() || "unknown"
    const interventionType = strategy.interventionType?.trim() || "renovation"
    const dimension = strategy.dimension?.trim() || undefined
    const label = strategy.node?.nameKey?.trim() || strategy.node?.slug?.trim() || strategy.nodeId

    if (!existing) {
      grouped.set(strategy.nodeId, {
        nodeId: strategy.nodeId,
        label,
        slug: strategy.node?.slug ?? undefined,
        realm,
        priority: strategy.priority,
        status: strategy.status,
        interventionType,
        dimension,
        strategyCount: 1,
        strategies: [strategy],
      })
      continue
    }

    existing.strategies.push(strategy)
    existing.strategyCount = existing.strategies.length

    if (rank(priorityRank, strategy.priority) > rank(priorityRank, existing.priority)) {
      existing.priority = strategy.priority
      existing.interventionType = interventionType
      existing.dimension = dimension
    }

    if (rank(statusRank, strategy.status) > rank(statusRank, existing.status)) {
      existing.status = strategy.status
    }
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const realmDelta = realmIndex(left.realm) - realmIndex(right.realm)
    if (realmDelta !== 0) return realmDelta
    return left.label.localeCompare(right.label, "zh-CN")
  })
}

function rank(source: Record<string, number>, value: string) {
  return source[value] ?? 0
}

function realmIndex(realm: string) {
  const index = realmOrder.indexOf(realm)
  return index === -1 ? realmOrder.length : index
}
