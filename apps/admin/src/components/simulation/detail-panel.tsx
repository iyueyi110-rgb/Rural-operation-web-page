import { asRecord, displayDate } from "@admin/lib/simulation-admin"
import {
  CompactStat,
  EmptyPanel,
  PolicyBadge,
  SectionHeading,
  SeverityBadge,
  StatusBadge,
} from "./shared"
import {
  badCaseCategoryLabel,
  buildEvidenceCheckSummary,
  eventTypeLabels,
  metricLabel,
  runFunnels,
  scenarioLabel,
  scenarioOf,
  statusDistribution,
  translateStatus,
  type SimulationBadCase,
  type SimulationEvent,
  type SimulationMetric,
  type SimulationRun,
} from "./types"

export function DetailPanel({
  badCases,
  events,
  metrics,
  onLoadBadCases,
  onLoadEvents,
  run,
}: {
  badCases: SimulationBadCase[]
  events: SimulationEvent[]
  metrics: SimulationMetric[]
  onLoadBadCases: () => void
  onLoadEvents: () => void
  run: SimulationRun | null
}) {
  if (!run)
    return (
      <EmptyPanel
        title="未选择模拟运行"
        detail="从模拟运行列表选择一个版本，查看状态、漏斗、事件和 Bad Case。"
      />
    )
  const evidence = buildEvidenceCheckSummary(run)
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-xl border border-stone bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex items-center gap-2">
            <PolicyBadge version={run.policyVersion} />
            <StatusBadge status={run.status} />
          </div>
          <h2 className="mt-3 text-xl font-extrabold">
            模拟运行 {run.simulationRunId ?? run.id}
          </h2>
          <p className="mt-1 font-mono text-xs text-ink/42">
            worldHash {run.worldHash ?? "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CompactStat
            label="模拟场景"
            value={scenarioLabel(scenarioOf(run))}
          />
          <CompactStat
            label="模拟种子"
            value={String(run.seed ?? run.config?.seed ?? "—")}
          />
          <CompactStat
            label="模拟规则修订"
            value={run.policyRevision ?? "初版"}
          />
          <CompactStat label="模拟 Bad Case" value={String(badCases.length)} />
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <ChartPanel
          title="模拟任务状态分布"
          description="任务在离散事件状态机中的最终分布"
        >
          <BarList values={statusDistribution(run)} />
        </ChartPanel>
        <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
          <SectionHeading
            eyebrow="过程转化"
            title="四个模拟漏斗"
            description="接单、提交、审核与权益履约使用同一事件口径。"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {runFunnels(run).map((funnel) => (
              <Funnel key={funnel.label} {...funnel} />
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SimulationConfigPanel run={run} />
        <EvidenceCheckPanel summary={evidence} />
      </div>
      <ChartPanel
        title="模拟统一指标"
        description="分母为 0 时显示 —；指标保留分子、分母与定义。"
      >
        <MetricGrid metrics={metrics} />
      </ChartPanel>
      <div className="grid gap-5 xl:grid-cols-2">
        <TimelinePanel events={events} onMore={onLoadEvents} />
        <BadCaseSummary badCases={badCases} onMore={onLoadBadCases} />
      </div>
    </div>
  )
}

function SimulationConfigPanel({ run }: { run: SimulationRun }) {
  const config = asRecord(run.config)
  const taskRange = asRecord(config.tasksPerAdoption)
  const values: Array<[string, unknown]> = [
    ["模拟种子", run.seed ?? config.seed],
    [
      "模拟统计窗口",
      config.durationDays ? `${config.durationDays} 天` : undefined,
    ],
    ["模拟认养订单", config.adoptionCount],
    ["模拟果树", config.treeCount],
    ["模拟村民", config.villagerCount],
    ["模拟审核员", config.reviewerCount],
    [
      "模拟每单任务",
      `${taskRange.min ?? config.minTasksPerAdoption ?? "—"}–${taskRange.max ?? config.maxTasksPerAdoption ?? "—"}`,
    ],
    [
      "模拟场景",
      scenarioLabel(
        String(config.scenario ?? config.scenarioId ?? scenarioOf(run) ?? ""),
      ),
    ],
    [
      "模拟起始时间",
      config.startAt ? displayDate(String(config.startAt)) : "—",
    ],
    [
      "模拟天气 / 异常",
      `${config.weatherEnabled === false ? "关闭" : "开启"} / ${(config.anomalyEnabled ?? config.anomaliesEnabled) === false ? "关闭" : "开启"}`,
    ],
  ]
  return (
    <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
      <SectionHeading
        eyebrow="运行快照"
        title="模拟完整配置"
        description="运行创建后不可变，用于重放和成对归因。"
      />
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone bg-stone">
        {values.map(([label, value]) => (
          <div className="bg-white p-3" key={String(label)}>
            <dt className="text-[10px] font-extrabold text-ink/40">{label}</dt>
            <dd className="mt-1 text-sm font-extrabold">
              {String(value ?? "—")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function EvidenceCheckPanel({
  summary,
}: {
  summary: ReturnType<typeof buildEvidenceCheckSummary>
}) {
  return (
    <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
      <SectionHeading
        eyebrow="规则预检"
        title="基于规则的模拟凭证检查"
        description="不接入真实图像审核；按照片、字段、树号、时间和描述规则确定性检查。"
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <CompactStat label="模拟通过" value={String(summary.passed)} />
        <CompactStat label="模拟失败" value={String(summary.failed)} />
        <CompactStat label="模拟待检查" value={String(summary.pending)} />
      </div>
      <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-stone">
        {summary.items.map((item, index) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-stone px-3 py-2 text-xs last:border-b-0"
            key={String(item.id ?? index)}
          >
            <span className="truncate font-mono text-ink/52">
              {String(item.taskId ?? item.id ?? `submission-${index + 1}`)}
            </span>
            <span
              className={`rounded-full px-2 py-1 font-extrabold ${item.precheckPassed === true ? "bg-moss/10 text-moss" : item.precheckPassed === false ? "bg-lychee/10 text-lychee" : "bg-ink/5 text-ink/45"}`}
            >
              {item.precheckPassed === true
                ? "模拟通过"
                : item.precheckPassed === false
                  ? "模拟失败"
                  : "模拟待检查"}
            </span>
          </div>
        ))}
        {!summary.items.length ? (
          <p className="p-5 text-center text-xs font-bold text-ink/42">
            暂无模拟提交凭证。
          </p>
        ) : null}
      </div>
    </section>
  )
}

function MetricGrid({ metrics }: { metrics: SimulationMetric[] }) {
  if (!metrics.length)
    return (
      <div className="mt-4 rounded-lg bg-rice p-8 text-center text-sm font-bold text-ink/42">
        当前接口未返回模拟指标。
      </div>
    )
  return (
    <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-stone bg-stone sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const key = metric.key ?? metric.name ?? `metric-${index}`
        const value =
          metric.value === null
            ? "—"
            : metric.unit === "ratio"
              ? `${(metric.value * 100).toFixed(1)}%`
              : metric.unit === "hours"
                ? `${metric.value.toFixed(1)} 小时`
                : metric.value.toFixed(metric.unit === "count" ? 0 : 2)
        return (
          <div className="bg-white p-4" key={key}>
            <div className="text-xs font-extrabold text-ink/48">
              {metricLabel(key, metric)}
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight">
              {value}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-ink/42">
              {metric.numerator ?? "—"} / {metric.denominator ?? "—"} ·{" "}
              {metric.definition ?? "统一模拟事件口径"}
            </div>
          </div>
        )
      })}
    </div>
  )
}
function TimelinePanel({
  events,
  onMore,
}: {
  events: SimulationEvent[]
  onMore: () => void
}) {
  return (
    <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <SectionHeading eyebrow="时间序列" title="模拟事件时间线" compact />
        <button
          className="text-xs font-extrabold text-water"
          onClick={onMore}
          type="button"
        >
          查看全部
        </button>
      </div>
      <div className="mt-4 grid gap-0">
        {events.map((event) => (
          <div className="grid grid-cols-[18px_1fr] gap-3" key={event.id}>
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-water" />
              <span className="h-full w-px bg-stone" />
            </div>
            <div className="pb-4">
              <div className="text-sm font-extrabold">
                {eventTypeLabels[event.eventType ?? ""] ??
                  event.eventType ??
                  "模拟事件"}
              </div>
              <div className="mt-1 text-xs font-semibold text-ink/42">
                {displayDate(event.occurredAt ?? event.timestamp)} ·{" "}
                {event.taskId ?? event.adoptionId ?? event.actorId ?? "运行级"}
              </div>
            </div>
          </div>
        ))}
        {!events.length ? (
          <p className="rounded-lg bg-rice p-5 text-center text-sm font-bold text-ink/42">
            打开详情时将加载模拟事件。
          </p>
        ) : null}
      </div>
    </section>
  )
}
function BadCaseSummary({
  badCases,
  onMore,
}: {
  badCases: SimulationBadCase[]
  onMore: () => void
}) {
  return (
    <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <SectionHeading eyebrow="异常证据" title="模拟 Bad Case" compact />
        <button
          className="text-xs font-extrabold text-water"
          onClick={onMore}
          type="button"
        >
          进入复盘
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {badCases.slice(0, 6).map((item) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-stone p-3"
            key={item.id}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold">
                {item.title ?? badCaseCategoryLabel(item.category)}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-ink/42">
                {badCaseCategoryLabel(item.category)} · {item.taskId ?? item.id}
              </div>
            </div>
            <SeverityBadge severity={item.severity} />
          </div>
        ))}
        {!badCases.length ? (
          <p className="rounded-lg bg-rice p-5 text-center text-sm font-bold text-ink/42">
            当前模拟运行未加载 Bad Case。
          </p>
        ) : null}
      </div>
    </section>
  )
}
function BarList({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values)
  const max = Math.max(...entries.map(([, value]) => value), 1)
  return entries.length ? (
    <div className="mt-5 grid gap-3">
      {entries.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1.5 flex justify-between text-xs font-bold">
            <span>{translateStatus(label)}</span>
            <span>{value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-rice">
            <div
              className="h-full rounded-full bg-gradient-to-r from-moss to-water"
              style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-4 rounded-lg bg-rice p-8 text-center text-sm font-bold text-ink/42">
      当前接口未返回模拟状态分布
    </p>
  )
}
function Funnel({
  label,
  steps,
}: {
  label: string
  steps: Array<{ label: string; value: number }>
}) {
  const max = Math.max(...steps.map((step) => step.value), 1)
  return (
    <div className="rounded-lg border border-stone bg-surface p-4">
      <div className="text-sm font-extrabold">{label}</div>
      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => (
          <div
            className="grid grid-cols-[70px_1fr_42px] items-center gap-2 text-xs"
            key={`${step.label}-${index}`}
          >
            <span className="truncate font-bold text-ink/52">{step.label}</span>
            <div className="h-5 overflow-hidden rounded bg-rice">
              <div
                className="h-full bg-water/70"
                style={{ width: `${Math.max(4, (step.value / max) * 100)}%` }}
              />
            </div>
            <span className="text-right font-extrabold">{step.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function ChartPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
      <SectionHeading
        eyebrow="事件口径"
        title={title}
        description={description}
      />
      {children}
    </section>
  )
}
