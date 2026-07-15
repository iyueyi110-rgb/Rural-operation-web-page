import {
  asRecord,
  scenarioOptions,
  type PolicyVersion,
  type SimulationConfigForm,
} from "@admin/lib/simulation-admin"

export interface SimulationMetric {
  key?: string
  name?: string
  label?: string
  numerator?: number
  denominator?: number
  value: number | null
  unit?: string
  definition?: string
}

export interface SimulationTaskResult extends Record<string, unknown> {
  id: string
  status?: string
  taskType?: string
  zone?: string
  assignedVillagerId?: string
  assignmentAttempts?: number
  dueAt?: string
  effectiveDueAt?: string
  acceptedAt?: string
  submittedAt?: string
  approvedAt?: string
  completedAt?: string
  firstReviewPassed?: boolean
  rightsFulfilledOnTime?: boolean
}

export interface SimulationRun extends Record<string, unknown> {
  id: string
  simulationRunId?: string
  pairId?: string
  comparisonId?: string
  policyVersion: PolicyVersion
  policyRevision?: string
  scenario?: string
  scenarioId?: string
  seed?: number
  status?: string
  dataOrigin?: string
  worldHash?: string
  config?: Partial<SimulationConfigForm> & { scenario?: string }
  metrics?:
    | SimulationMetric[]
    | Record<string, SimulationMetric | number | null>
  result?: Record<string, unknown>
  tasks?: SimulationTaskResult[]
  assignments?: Array<Record<string, unknown>>
  submissions?: Array<Record<string, unknown>>
  reviews?: Array<Record<string, unknown>>
  fulfillments?: Array<Record<string, unknown>>
  events?: SimulationEvent[]
  badCases?: SimulationBadCase[]
  suggestions?: string[]
  risks?: string[]
  startedAt?: string
  createdAt?: string
  completedAt?: string
  archivedAt?: string | null
}

export interface SimulationEvent extends Record<string, unknown> {
  id: string
  eventType?: string
  occurredAt?: string
  timestamp?: string
  simulationRunId?: string
  runId?: string
  policyVersion?: PolicyVersion
  adoptionId?: string
  taskId?: string
  actorId?: string
  actorType?: string
  fromState?: string
  toState?: string
  fromStatus?: string
  toStatus?: string
  payload?: unknown
}

export interface SimulationBadCase extends Record<string, unknown> {
  id: string
  simulationRunId?: string
  runId?: string
  policyVersion?: PolicyVersion
  category?: string
  severity?: string
  title?: string
  description?: string
  adoptionId?: string
  taskId?: string
  rootCause?: string | null
  improvementAction?: string | null
  eventIds?: string[]
}

export interface MetricComparison {
  key?: string
  name?: string
  label?: string
  v0?: SimulationMetric | number | null
  v1?: SimulationMetric | number | null
  absoluteDifference?: number | null
  percentagePointDifference?: number | null
  safeRelativeChange?: number | null
}

export interface ComparisonResult extends Record<string, unknown> {
  id?: string
  comparisonId?: string
  v0RunId?: string
  v1RunId?: string
  worldHash?: string
  metrics?: MetricComparison[] | Record<string, MetricComparison>
  recommendation?: string
  reasons?: string[]
  suggestions?: string[]
  risks?: string[]
  decision?: string
  verdict?: string
}

export interface SimulationBreakdownRow {
  key: string
  label: string
  taskCountV0: number
  taskCountV1: number
  effects: SimulationBreakdownEffect[]
}

export interface SimulationEffectValue {
  numerator: number
  denominator: number
  value: number | null
}

export interface SimulationBreakdownEffect {
  key:
    | "acceptance_rate"
    | "on_time_submission_rate"
    | "first_review_pass_rate"
    | "overdue_rate"
  label: string
  v0: SimulationEffectValue
  v1: SimulationEffectValue
}

export interface SimulationBreakdown {
  key: "taskType" | "zone" | "scenario" | "executorLoad"
  label: string
  source: string
  rows: SimulationBreakdownRow[]
}

export const exportArtifacts = [
  "simulation_config.json",
  "simulation_runs.csv",
  "simulation_events.csv",
  "simulation_tasks.csv",
  "simulation_assignments.csv",
  "simulation_submissions.csv",
  "simulation_reviews.csv",
  "simulation_bad_cases.csv",
  "simulation_metrics.json",
  "simulation_comparison.json",
  "simulation_report.md",
]

export const metricLabels: Record<string, string> = {
  acceptance_rate: "模拟接单率",
  on_time_submission_rate: "模拟按时提交率",
  first_review_pass_rate: "模拟首次审核通过率",
  final_review_pass_rate: "模拟最终审核通过率",
  reassignment_rate: "模拟重新分配率",
  overdue_rate: "模拟逾期率",
  average_acceptance_hours: "模拟平均接单时间",
  average_review_hours: "模拟平均审核时间",
  review_return_rate: "模拟审核退回率",
  rights_on_time_fulfillment_rate: "模拟权益按时履约率",
  anomaly_detection_rate: "模拟异常发现率",
  assignment_fairness_cv: "模拟分配公平性 CV",
  manual_intervention_count: "模拟运营人工介入次数",
}

export const eventTypeLabels: Record<string, string> = {
  ADOPTION_CREATED: "模拟认养创建",
  TREE_ASSIGNED: "模拟果树分配",
  TASK_CREATED: "模拟任务创建",
  TASK_ASSIGNED: "模拟任务分配",
  TASK_ACCEPTED: "模拟任务接单",
  TASK_REJECTED: "模拟任务拒单",
  TASK_REASSIGNED: "模拟任务重分配",
  TASK_STARTED: "模拟开始执行",
  TASK_SUBMITTED: "模拟任务提交",
  SUBMISSION_PRECHECK_FAILED: "模拟规则预检查未通过",
  REVIEW_STARTED: "模拟开始审核",
  REVIEW_APPROVED: "模拟审核通过",
  REVIEW_RETURNED: "模拟审核退回",
  TASK_OVERDUE: "模拟任务逾期",
  REMINDER_SENT: "模拟提醒发送",
  WEATHER_DELAY_APPROVED: "模拟天气延期批准",
  BENEFIT_FULFILLED: "模拟权益履约",
  MANUAL_INTERVENTION: "模拟人工介入",
  ANOMALY_DETECTED: "模拟异常发现",
}

export function normalizeRuns(payload: unknown): SimulationRun[] {
  const unwrapped =
    "data" in asRecord(payload) ? asRecord(payload).data : payload
  const record = asRecord(unwrapped)
  const candidates = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.runs)
        ? record.runs
        : typeof record.id === "string" ||
            typeof record.simulationRunId === "string"
          ? [record]
          : Object.keys(asRecord(record.run)).length
            ? [record]
            : [record.v0, record.v1].filter(Boolean)
  return candidates.flatMap((candidate) => {
    const detail = asRecord(candidate)
    const persisted = Object.keys(asRecord(detail.run)).length
      ? asRecord(detail.run)
      : detail
    const result = asRecord(persisted.result)
    const worldRecord = asRecord(detail.world)
    const world = asRecord(worldRecord.payload)
    const run: Record<string, unknown> = {
      ...result,
      ...persisted,
      simulationRunId:
        result.simulationRunId ?? persisted.simulationRunId ?? persisted.id,
      worldHash:
        result.worldHash ??
        persisted.worldHash ??
        world.worldHash ??
        worldRecord.worldHash,
      config:
        result.config ?? persisted.config ?? world.config ?? worldRecord.config,
      seed: result.seed ?? persisted.seed ?? persisted.randomSeed,
      scenario:
        result.scenario ??
        persisted.scenario ??
        asRecord(result.config).scenario ??
        asRecord(persisted.config).scenario ??
        asRecord(world.config).scenario ??
        persisted.scenarioId ??
        worldRecord.scenarioId,
      metrics: result.metrics ?? persisted.metrics,
      events: Array.isArray(detail.events) ? detail.events : result.events,
      badCases: Array.isArray(detail.badCases)
        ? detail.badCases
        : result.badCases,
    }
    const id =
      typeof run.id === "string"
        ? run.id
        : typeof run.simulationRunId === "string"
          ? run.simulationRunId
          : ""
    return id ? [{ ...run, id } as SimulationRun] : []
  })
}

export function metricsFromRun(run: SimulationRun | null): SimulationMetric[] {
  if (!run) return []
  const source = run.metrics ?? asRecord(run.result).metrics
  if (Array.isArray(source)) return source.filter(isMetric)
  return Object.entries(asRecord(source))
    .map(([key, value]) =>
      typeof value === "number" || value === null
        ? { key, value }
        : { key, ...asRecord(value) },
    )
    .filter(isMetric) as SimulationMetric[]
}

export function comparisonRows(
  comparison: ComparisonResult | null,
  v0?: SimulationRun,
  v1?: SimulationRun,
) {
  const source = comparison?.metrics
  const v0Metrics = metricsFromRun(v0 ?? null)
  const v1Metrics = metricsFromRun(v1 ?? null)
  if (Array.isArray(source))
    return source.map((row, index) => ({
      key: row.key ?? row.name ?? row.label ?? `metric-${index}`,
      v0: toMetric(
        row.v0,
        row.key,
        v0Metrics.find((metric) => metricKey(metric) === row.key),
      ),
      v1: toMetric(
        row.v1,
        row.key,
        v1Metrics.find((metric) => metricKey(metric) === row.key),
      ),
    }))
  if (source && typeof source === "object") {
    return Object.entries(source).map(([key, row]) => ({
      key,
      v0: toMetric(
        row.v0,
        key,
        v0Metrics.find((metric) => metricKey(metric) === key),
      ),
      v1: toMetric(
        row.v1,
        key,
        v1Metrics.find((metric) => metricKey(metric) === key),
      ),
    }))
  }
  const keys = [
    ...new Set([...v0Metrics.map(metricKey), ...v1Metrics.map(metricKey)]),
  ]
  return keys.map((key) => ({
    key,
    v0: v0Metrics.find((metric) => metricKey(metric) === key),
    v1: v1Metrics.find((metric) => metricKey(metric) === key),
  }))
}

export function buildRunBreakdowns(
  v0?: SimulationRun,
  v1?: SimulationRun,
): SimulationBreakdown[] {
  const source = "由已载入成对模拟运行结果确定性聚合"
  const compareGroups = (
    key: SimulationBreakdown["key"],
    label: string,
    v0Groups: Record<string, SimulationTaskResult[]>,
    v1Groups: Record<string, SimulationTaskResult[]>,
    labeler: (value: string) => string,
    groupSource = source,
  ): SimulationBreakdown => ({
    key,
    label,
    source: groupSource,
    rows: [...new Set([...Object.keys(v0Groups), ...Object.keys(v1Groups)])]
      .sort()
      .map((value) => ({
        key: value,
        label: labeler(value),
        taskCountV0: v0Groups[value]?.length ?? 0,
        taskCountV1: v1Groups[value]?.length ?? 0,
        effects: effectComparisons(
          v0Groups[value] ?? [],
          v1Groups[value] ?? [],
          v0,
          v1,
        ),
      })),
  })
  const v0Tasks = v0?.tasks ?? []
  const v1Tasks = v1?.tasks ?? []
  return [
    compareGroups(
      "taskType",
      "模拟任务类型分解（核心效果）",
      groupTasks(v0Tasks, (task) => task.taskType ?? "unknown"),
      groupTasks(v1Tasks, (task) => task.taskType ?? "unknown"),
      taskTypeLabel,
    ),
    compareGroups(
      "zone",
      "模拟区域分解（核心效果）",
      groupTasks(v0Tasks, (task) => task.zone ?? "unknown"),
      groupTasks(v1Tasks, (task) => task.zone ?? "unknown"),
      zoneLabel,
    ),
    compareGroups(
      "scenario",
      "模拟当前场景效果",
      v0 ? { [scenarioOf(v0) ?? "unknown"]: v0Tasks } : {},
      v1 ? { [scenarioOf(v1) ?? "unknown"]: v1Tasks } : {},
      scenarioLabel,
      "当前选择的单组场景效果；不表示跨场景结论",
    ),
    compareGroups(
      "executorLoad",
      "模拟执行者负荷分解（核心效果）",
      groupTasks(v0Tasks, (task) => task.assignedVillagerId ?? "unassigned"),
      groupTasks(v1Tasks, (task) => task.assignedVillagerId ?? "unassigned"),
      (value) => (value === "unassigned" ? "未分配" : value),
    ),
  ]
}

export function resolveSelectedRun(
  current: SimulationRun | null,
  nextRuns: SimulationRun[],
) {
  if (!current) return nextRuns[0] ?? null
  return (
    nextRuns.find(
      (run) =>
        run.id === current.id && run.policyVersion === current.policyVersion,
    ) ??
    nextRuns.find((run) => run.policyVersion === current.policyVersion) ??
    nextRuns[0] ??
    null
  )
}

const lowerIsBetterMetrics = new Set([
  "overdue_rate",
  "reassignment_rate",
  "average_acceptance_hours",
  "average_review_hours",
  "review_return_rate",
  "assignment_fairness_cv",
  "manual_intervention_count",
])

export function metricDeltaTone(
  key: string,
  v0: number | null,
  v1: number | null,
): "positive" | "negative" | "neutral" {
  if (v0 === null || v1 === null || v0 === v1) return "neutral"
  const improved = lowerIsBetterMetrics.has(key) ? v1 < v0 : v1 > v0
  return improved ? "positive" : "negative"
}

export function buildEvidenceCheckSummary(run: SimulationRun) {
  const items = run.submissions ?? []
  return {
    passed: items.filter((item) => item.precheckPassed === true).length,
    failed: items.filter((item) => item.precheckPassed === false).length,
    pending: items.filter((item) => typeof item.precheckPassed !== "boolean")
      .length,
    items,
  }
}

const badCaseCategoryLabels: Record<string, string> = {
  inventory_shortage: "库存不足",
  assignment_exhausted: "分配尝试耗尽",
  overdue: "任务逾期",
  quality_return: "质量退回",
  review_backlog: "审核积压",
  rights_delay: "权益延迟",
  anomaly_missed: "异常漏检",
}

export function badCaseCategoryLabel(value?: string) {
  return value ? (badCaseCategoryLabels[value] ?? value) : "未分类"
}
export function actorTypeLabel(value?: string) {
  return (
    (
      {
        system: "规则系统",
        villager: "村民",
        reviewer: "审核员",
        operator: "运营人员",
      } as Record<string, string>
    )[value ?? ""] ??
    value ??
    "—"
  )
}

export function buildBadCasePolicyComparison(items: SimulationBadCase[]) {
  const categories = [
    ...new Set(items.map((item) => item.category ?? "unknown")),
  ].sort()
  return categories.map((category) => ({
    category,
    label: badCaseCategoryLabel(category),
    v0: items.filter(
      (item) => item.category === category && item.policyVersion === "V0",
    ).length,
    v1: items.filter(
      (item) => item.category === category && item.policyVersion === "V1",
    ).length,
  }))
}

export function statusDistribution(run: SimulationRun) {
  const supplied = extractRecord(
    asRecord(run.result).statusDistribution ?? run.statusDistribution,
  )
  return Object.keys(supplied).length
    ? supplied
    : countBy(run.tasks ?? [], (task) => task.status ?? "unknown")
}

export function runFunnels(run: SimulationRun) {
  const tasks = run.tasks ?? []
  const supplied = extractFunnels(asRecord(run.result).funnels ?? run.funnels)
  if (supplied.some((funnel) => funnel.steps.length)) return supplied
  const accepted = tasks.filter((task) => task.acceptedAt).length
  const submitted = tasks.filter((task) => task.submittedAt).length
  const approved = tasks.filter((task) => task.approvedAt).length
  const completed = tasks.filter((task) => task.completedAt).length
  const benefits = tasks.filter(
    (task) => task.rightsFulfilledOnTime !== undefined,
  )
  return [
    {
      label: "模拟接单漏斗",
      steps: [
        { label: "已创建", value: tasks.length },
        { label: "已接单", value: accepted },
      ],
    },
    {
      label: "模拟提交漏斗",
      steps: [
        { label: "已接单", value: accepted },
        { label: "已提交", value: submitted },
      ],
    },
    {
      label: "模拟审核漏斗",
      steps: [
        { label: "已提交", value: submitted },
        { label: "已通过", value: approved },
      ],
    },
    {
      label: "模拟权益漏斗",
      steps: [
        { label: "待履约", value: benefits.length },
        {
          label: "按时履约",
          value: benefits.filter((task) => task.rightsFulfilledOnTime).length,
        },
        { label: "已完成", value: completed },
      ],
    },
  ]
}

export function metricLabel(key: string, metric?: SimulationMetric) {
  const raw = metric?.label ?? metric?.name ?? metricLabels[key] ?? key
  return raw.startsWith("模拟") ? raw : `模拟${raw}`
}

export function runLabel(run: SimulationRun) {
  return `${run.policyVersion} · ${run.simulationRunId ?? run.id}`
}
export function scenarioOf(run: SimulationRun) {
  return (
    run.scenario ??
    run.scenarioId ??
    run.config?.scenario ??
    run.config?.scenarioId
  )
}
export function scenarioLabel(value?: string) {
  return (
    scenarioOptions.find((scenario) => scenario.value === value)?.label ??
    value ??
    "未标记场景"
  )
}
export function translateStatus(value: string) {
  const labels: Record<string, string> = {
    created: "已创建",
    assigned: "已分配",
    accepted: "已接单",
    in_progress: "执行中",
    submitted: "已提交",
    approved: "已通过",
    completed: "已完成",
    overdue: "已逾期",
    returned: "已退回",
    cancelled: "已取消",
  }
  return labels[value.toLowerCase()] ?? value
}
export function severityLabel(value: string) {
  return (
    (
      {
        critical: "严重",
        high: "高风险",
        medium: "中风险",
        low: "低风险",
      } as Record<string, string>
    )[value] ?? value
  )
}
export function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const name = key(item)
    counts[name] = (counts[name] ?? 0) + 1
    return counts
  }, {})
}

function metricKey(metric: SimulationMetric) {
  return metric.key ?? metric.name ?? metric.label ?? "unknown"
}
function isMetric(value: unknown): value is SimulationMetric {
  return Boolean(
    value &&
    typeof value === "object" &&
    (typeof (value as SimulationMetric).value === "number" ||
      (value as SimulationMetric).value === null),
  )
}
function toMetric(
  value: SimulationMetric | number | null | undefined,
  key?: string,
  fallback?: SimulationMetric,
): SimulationMetric | undefined {
  if (value === undefined) return fallback
  if (typeof value === "object" && value !== null)
    return { ...fallback, ...value }
  return {
    ...fallback,
    key,
    value: value ?? null,
    unit:
      fallback?.unit ??
      (key?.includes("rate")
        ? "ratio"
        : key?.includes("hours")
          ? "hours"
          : key?.includes("count")
            ? "count"
            : "coefficient"),
  }
}
function extractRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  )
}
function extractFunnels(value: unknown) {
  const source = asRecord(value)
  const labels: Record<string, string> = {
    acceptance: "模拟接单漏斗",
    submission: "模拟提交漏斗",
    review: "模拟审核漏斗",
    fulfillment: "模拟权益漏斗",
  }
  const ordered = ["acceptance", "submission", "review", "fulfillment"]
  return ordered.map((key) => {
    const raw = source[key]
    return {
      label: labels[key] ?? `模拟${key}漏斗`,
      steps: Array.isArray(raw)
        ? raw.map((step) => ({
            label: String(
              asRecord(step).label ?? asRecord(step).name ?? "阶段",
            ),
            value: Number(asRecord(step).value ?? asRecord(step).count ?? 0),
          }))
        : Object.entries(extractRecord(raw)).map(([label, stepValue]) => ({
            label,
            value: stepValue,
          })),
    }
  })
}
function groupTasks(
  tasks: SimulationTaskResult[],
  key: (task: SimulationTaskResult) => string,
) {
  return tasks.reduce<Record<string, SimulationTaskResult[]>>(
    (groups, task) => {
      const value = key(task)
      ;(groups[value] ??= []).push(task)
      return groups
    },
    {},
  )
}
function effectComparisons(
  v0Tasks: SimulationTaskResult[],
  v1Tasks: SimulationTaskResult[],
  v0?: SimulationRun,
  v1?: SimulationRun,
): SimulationBreakdownEffect[] {
  const v0Values = calculateCoreEffects(
    v0Tasks,
    v0?.assignments,
    v0?.completedAt,
  )
  const v1Values = calculateCoreEffects(
    v1Tasks,
    v1?.assignments,
    v1?.completedAt,
  )
  const labels: Record<SimulationBreakdownEffect["key"], string> = {
    acceptance_rate: "接单率",
    on_time_submission_rate: "按时提交率",
    first_review_pass_rate: "首审通过率",
    overdue_rate: "逾期率",
  }
  return (Object.keys(labels) as Array<SimulationBreakdownEffect["key"]>).map(
    (key) => ({
      key,
      label: labels[key],
      v0: v0Values[key],
      v1: v1Values[key],
    }),
  )
}
function calculateCoreEffects(
  tasks: SimulationTaskResult[],
  assignments: Array<Record<string, unknown>> = [],
  observationEnd?: string,
) {
  const validAssignments = assignments.filter(
    (assignment) =>
      Boolean(assignment.villagerId) &&
      typeof assignment.assignedAt === "string" &&
      (!observationEnd || assignment.assignedAt <= observationEnd),
  )
  const acceptedAssignments = validAssignments.filter(
    (assignment) => assignment.status === "accepted",
  )
  const accepted = tasks.filter((task) => Boolean(task.acceptedAt))
  const due = accepted.filter(
    (task) =>
      !observationEnd ||
      !task.effectiveDueAt ||
      task.effectiveDueAt <= observationEnd,
  )
  const reviewed = tasks.filter((task) => task.firstReviewPassed !== undefined)
  const metric = (
    numerator: number,
    denominator: number,
  ): SimulationEffectValue => ({
    numerator,
    denominator,
    value: denominator === 0 ? null : numerator / denominator,
  })
  return {
    acceptance_rate: metric(
      acceptedAssignments.length,
      validAssignments.length,
    ),
    on_time_submission_rate: metric(
      due.filter(
        (task) =>
          task.submittedAt &&
          (!task.effectiveDueAt || task.submittedAt <= task.effectiveDueAt),
      ).length,
      due.length,
    ),
    first_review_pass_rate: metric(
      reviewed.filter((task) => task.firstReviewPassed).length,
      reviewed.length,
    ),
    overdue_rate: metric(
      due.filter(
        (task) =>
          !task.submittedAt ||
          Boolean(
            task.effectiveDueAt && task.submittedAt > task.effectiveDueAt,
          ),
      ).length,
      due.length,
    ),
  }
}
function taskTypeLabel(value: string) {
  return (
    (
      {
        watering: "浇水",
        fertilizing: "施肥",
        pest_inspection: "病虫检查",
        growth_photo: "生长拍照",
        tree_health_record: "树木健康记录",
        fruit_inspection: "果实检查",
        harvest: "采收",
        packing: "打包",
        shipping: "配送",
        onsite_reception: "现场接待",
        drainage: "排水",
      } as Record<string, string>
    )[value] ?? value
  )
}
function zoneLabel(value: string) {
  return (
    (
      {
        near: "近区",
        mid: "中区",
        remote: "偏远区",
        unknown: "未标记区域",
      } as Record<string, string>
    )[value] ?? value
  )
}
