export type PolicyVersion = "V0" | "V1"

export type ScenarioId =
  | "NORMAL"
  | "ADOPTION_PEAK"
  | "STAFF_SHORTAGE"
  | "CONTINUOUS_RAIN"
  | "LOW_SUBMISSION_QUALITY"
  | "REMOTE_ZONE_LOAD"
  | "REVIEW_BACKLOG"
  | "HARVEST_PEAK"

export interface SimulationConfigForm {
  seed: number
  durationDays: number
  adoptionCount: number
  treeCount: number
  villagerCount: number
  reviewerCount: number
  minTasksPerAdoption: number
  maxTasksPerAdoption: number
  scenarioId: ScenarioId
  policyVersions: PolicyVersion[]
  weatherEnabled: boolean
  anomaliesEnabled: boolean
}

export const defaultSimulationConfig: SimulationConfigForm = {
  seed: 20260713,
  durationDays: 30,
  adoptionCount: 100,
  treeCount: 100,
  villagerCount: 20,
  reviewerCount: 3,
  minTasksPerAdoption: 3,
  maxTasksPerAdoption: 5,
  scenarioId: "NORMAL",
  policyVersions: ["V0", "V1"],
  weatherEnabled: true,
  anomaliesEnabled: true,
}

export const scenarioOptions: Array<{
  value: ScenarioId
  label: string
  description: string
}> = [
  {
    value: "NORMAL",
    label: "常态运营",
    description: "标准订单、出勤与审核能力",
  },
  {
    value: "ADOPTION_PEAK",
    label: "认养高峰",
    description: "订单规模提升至 1.8 倍",
  },
  {
    value: "STAFF_SHORTAGE",
    label: "人手不足",
    description: "30% 村民与 1 名审核员不可用",
  },
  {
    value: "CONTINUOUS_RAIN",
    label: "连续降雨",
    description: "连续 5 天降雨，触发延期和新增任务",
  },
  {
    value: "LOW_SUBMISSION_QUALITY",
    label: "低质量提交",
    description: "凭证完整度与清晰度承压",
  },
  {
    value: "REMOTE_ZONE_LOAD",
    label: "偏远区域负载",
    description: "远距离任务集中出现",
  },
  {
    value: "REVIEW_BACKLOG",
    label: "审核积压",
    description: "审核时长与队列持续增加",
  },
  {
    value: "HARVEST_PEAK",
    label: "采收高峰",
    description: "权益履约任务在窗口期聚集",
  },
]

export interface EventFilters {
  runId: string
  adoptionId: string
  taskId: string
  actorId: string
  actorType: string
  eventType: string
  policyVersion: string
  startTime: string
  endTime: string
}

export function buildSimulationFilters(filters: Partial<EventFilters>) {
  const query = new URLSearchParams()
  const keys: Array<keyof EventFilters> = [
    "runId",
    "adoptionId",
    "taskId",
    "actorId",
    "actorType",
    "eventType",
    "policyVersion",
    "startTime",
    "endTime",
  ]
  for (const key of keys) {
    const value = filters[key]?.trim()
    if (value) query.set(key, value)
  }
  return query
}

export function normalizeSimulationList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []
  const data = (payload as { data?: unknown }).data
  if (Array.isArray(data)) return data as T[]
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return (data as { items: T[] }).items
  }
  if (Array.isArray((payload as { items?: unknown }).items))
    return (payload as { items: T[] }).items
  return []
}

export interface MetricLike {
  value: number | null
  unit?: string
}

export function isRateMetric(metric?: MetricLike | null) {
  return (
    metric?.unit === "rate" ||
    metric?.unit === "ratio" ||
    metric?.unit === "percentage"
  )
}

export function formatMetricValue(metric?: MetricLike | null) {
  if (!metric || metric.value === null || !Number.isFinite(metric.value))
    return "—"
  if (isRateMetric(metric)) return `${(metric.value * 100).toFixed(1)}%`
  if (metric.unit === "hours" || metric.unit === "hour")
    return `${metric.value.toFixed(1)} 小时`
  if (metric.unit === "minutes" || metric.unit === "minute")
    return `${metric.value.toFixed(1)} 分钟`
  if (metric.unit === "count") return metric.value.toFixed(0)
  return Number.isInteger(metric.value)
    ? metric.value.toFixed(0)
    : metric.value.toFixed(2)
}

export function formatMetricDelta(
  v0?: MetricLike | null,
  v1?: MetricLike | null,
) {
  if (!v0 || !v1 || v0.value === null || v1.value === null) return "—"
  const delta = v1.value - v0.value
  if (isRateMetric(v0) || isRateMetric(v1)) {
    return `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)} 个百分点`
  }
  const absolute = `${delta >= 0 ? "+" : ""}${Number.isInteger(delta) ? delta.toFixed(0) : delta.toFixed(2)}`
  if (v0.value === 0) return `${absolute}（基线为 0）`
  const change = (delta / Math.abs(v0.value)) * 100
  return `${absolute}（${change >= 0 ? "+" : ""}${change.toFixed(1)}%）`
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function unwrapData<T>(payload: unknown): T {
  const record = asRecord(payload)
  return ("data" in record ? record.data : payload) as T
}

export function displayDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
}

export const simulationDisclaimer = "模拟运营数据，不代表真实业务结果"

export const approvedSimulationRecommendations = [
  "模拟结果建议采用V1",
  "模拟结果暂不支持升级",
  "存在场景退化，需要继续调整",
  "样本不足，暂不形成结论",
] as const

export function filterSimulationRecommendations(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const approved = new Set<string>(approvedSimulationRecommendations)
  return value.filter(
    (item): item is string => typeof item === "string" && approved.has(item),
  )
}
