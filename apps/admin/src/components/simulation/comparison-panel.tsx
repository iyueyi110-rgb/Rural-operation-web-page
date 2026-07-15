import {
  CircleAlert,
  GitCompareArrows,
  LoaderCircle,
  Sparkles,
} from "lucide-react"

import {
  filterSimulationRecommendations,
  formatMetricDelta,
  formatMetricValue,
} from "@admin/lib/simulation-admin"
import {
  ActionButton,
  controlClass,
  labelClass,
  SectionHeading,
  tdClass,
  thClass,
} from "./shared"
import {
  buildRunBreakdowns,
  comparisonRows,
  metricDeltaTone,
  metricLabel,
  runLabel,
  scenarioLabel,
  scenarioOf,
  type ComparisonResult,
  type SimulationMetric,
  type SimulationRun,
} from "./types"

export function ComparisonPanel({
  busy,
  comparison,
  ids,
  onChange,
  onCompare,
  runs,
}: {
  busy: boolean
  comparison: ComparisonResult | null
  ids: { v0RunId: string; v1RunId: string }
  onChange: (ids: { v0RunId: string; v1RunId: string }) => void
  onCompare: () => void
  runs: SimulationRun[]
}) {
  const v0 = runs.find((run) => run.id === ids.v0RunId)
  const v1 = runs.find((run) => run.id === ids.v1RunId)
  const rows = comparisonRows(comparison, v0, v1)
  const breakdowns = buildRunBreakdowns(v0, v1)
  const approved = filterSimulationRecommendations([
    comparison?.recommendation,
    ...(comparison?.suggestions ?? []),
  ])
  const reasons = Array.isArray(comparison?.reasons) ? comparison.reasons : []
  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
        <SectionHeading
          eyebrow="成对归因"
          title="模拟 V0/V1 对比"
          description="只有种子、场景、配置和 worldHash 相同的运行可进行策略归因。"
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
          <RunSelect
            label="模拟 V0 基线"
            runs={runs.filter((run) => run.policyVersion === "V0")}
            value={ids.v0RunId}
            onChange={(v0RunId) => onChange({ ...ids, v0RunId })}
          />
          <div className="hidden pb-3 text-ink/30 lg:block">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <RunSelect
            label="模拟 V1 策略"
            runs={runs.filter((run) => run.policyVersion === "V1")}
            value={ids.v1RunId}
            onChange={(v1RunId) => onChange({ ...ids, v1RunId })}
          />
          <ActionButton
            disabled={busy}
            icon={
              busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <GitCompareArrows className="h-4 w-4" />
              )
            }
            label="生成模拟对比"
            onClick={onCompare}
          />
        </div>
        <div className="mt-4 grid overflow-hidden rounded-xl border border-stone sm:grid-cols-2">
          <PolicyRail label="V0 · 轮询与人工处理" run={v0} tone="baseline" />
          <PolicyRail label="V1 · 匹配与规则预检" run={v1} tone="candidate" />
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-stone bg-white shadow-soft">
        <div className="border-b border-stone px-5 py-4">
          <SectionHeading
            eyebrow="同口径"
            title="模拟指标差值"
            description="率指标使用百分点差；颜色按指标改善方向计算。"
            compact
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-rice/80 text-xs font-extrabold text-ink/48">
              <tr>
                <th className={thClass}>模拟指标</th>
                <th className={thClass}>V0</th>
                <th className={thClass}>V1</th>
                <th className={thClass}>模拟差值</th>
                <th className={thClass}>口径</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-stone/70" key={row.key}>
                  <td className={`${tdClass} font-extrabold`}>
                    {metricLabel(row.key, row.v1 ?? row.v0)}
                  </td>
                  <td className={tdClass}>
                    {formatMetricValue(row.v0)}
                    <MetricEvidence metric={row.v0} />
                  </td>
                  <td className={tdClass}>
                    {formatMetricValue(row.v1)}
                    <MetricEvidence metric={row.v1} />
                  </td>
                  <td
                    className={`${tdClass} font-extrabold ${deltaTone(row.key, row.v0, row.v1)}`}
                  >
                    {formatMetricDelta(row.v0, row.v1)}
                  </td>
                  <td className={`${tdClass} max-w-xs text-xs text-ink/48`}>
                    {row.v1?.definition ??
                      row.v0?.definition ??
                      "统一模拟事件口径"}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    className="px-5 py-14 text-center font-bold text-ink/42"
                    colSpan={5}
                  >
                    选择成对运行并生成模拟对比。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
        <SectionHeading
          eyebrow="确定性聚合"
          title="模拟四维核心效果对比"
          description="从已载入的成对运行任务结果计算，所有比例均显示分子/分母。"
        />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {breakdowns.map((group) => (
            <article
              className="rounded-lg border border-stone p-4"
              key={group.key}
            >
              <h3 className="text-sm font-extrabold">{group.label}</h3>
              <p className="mt-1 text-[10px] font-semibold text-ink/40">
                {group.source}
              </p>
              <div className="mt-3 grid gap-3">
                {group.rows.map((row) => (
                  <div className="rounded-lg bg-rice p-3" key={row.key}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-extrabold">
                        {row.label}
                      </span>
                      <span className="text-[10px] font-bold text-ink/42">
                        任务 V0 {row.taskCountV0} / V1 {row.taskCountV1}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {row.effects.map((effect) => (
                        <div
                          className="rounded-md border border-stone bg-white p-2"
                          key={effect.key}
                        >
                          <div className="text-[10px] font-extrabold text-ink/48">
                            模拟{effect.label}
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-1 text-[11px]">
                            <EffectValue label="V0" value={effect.v0} />
                            <EffectValue label="V1" value={effect.v1} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!group.rows.length ? (
                  <p className="text-xs font-semibold text-ink/42">
                    尚无可聚合的模拟结果。
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <InsightPanel
          icon={<Sparkles className="h-4 w-4" />}
          items={approved}
          title="模拟升级建议"
          empty="生成对比后显示样本判断与规则升级建议。"
        />
        <InsightPanel
          icon={<CircleAlert className="h-4 w-4" />}
          items={reasons}
          title="模拟判断依据"
          empty="当前接口未返回模拟判断依据。"
          tone="risk"
        />
      </div>
      {comparison ? (
        <section className="rounded-xl border border-water/25 bg-water/5 p-5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-water">
            模拟升级判断
          </div>
          <div className="mt-2 text-lg font-extrabold">
            {approved[0] ?? "模拟结果暂不支持升级"}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function RunSelect({
  label,
  onChange,
  runs,
  value,
}: {
  label: string
  onChange: (value: string) => void
  runs: SimulationRun[]
  value: string
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <select
        className={`${controlClass} mt-1.5 w-full`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">选择模拟运行</option>
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {runLabel(run)} · {scenarioLabel(scenarioOf(run))}
          </option>
        ))}
      </select>
    </label>
  )
}
function PolicyRail({
  label,
  run,
  tone,
}: {
  label: string
  run?: SimulationRun
  tone: "baseline" | "candidate"
}) {
  return (
    <div
      className={`relative p-5 ${tone === "candidate" ? "border-t border-stone sm:border-l sm:border-t-0" : ""}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${tone === "candidate" ? "bg-water" : "bg-ink/45"}`}
      />
      <div className="text-sm font-extrabold">{label}</div>
      <div className="mt-2 font-mono text-xs text-ink/42">
        {run?.simulationRunId ?? run?.id ?? "未选择"}
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-ink/32">
        worldHash {run?.worldHash ?? "—"}
      </div>
    </div>
  )
}
function InsightPanel({
  empty,
  icon,
  items,
  title,
  tone = "normal",
}: {
  empty: string
  icon: React.ReactNode
  items: string[]
  title: string
  tone?: "normal" | "risk"
}) {
  return (
    <section
      className={`rounded-xl border p-5 shadow-soft ${tone === "risk" ? "border-lychee/20 bg-lychee/[0.035]" : "border-water/20 bg-water/[0.035]"}`}
    >
      <div className="flex items-center gap-2 text-sm font-extrabold">
        {icon}
        {title}
      </div>
      <div className="mt-4 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex gap-2 text-sm font-semibold leading-6 text-ink/62"
              key={item}
            >
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "risk" ? "bg-lychee" : "bg-water"}`}
              />
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-ink/42">{empty}</p>
        )}
      </div>
    </section>
  )
}
function deltaTone(key: string, v0?: SimulationMetric, v1?: SimulationMetric) {
  const tone = metricDeltaTone(key, v0?.value ?? null, v1?.value ?? null)
  return tone === "positive"
    ? "text-moss"
    : tone === "negative"
      ? "text-lychee"
      : "text-ink/42"
}
function MetricEvidence({ metric }: { metric?: SimulationMetric }) {
  return metric &&
    (metric.numerator !== undefined || metric.denominator !== undefined) ? (
    <div className="mt-1 text-[10px] font-semibold text-ink/38">
      {metric.numerator ?? "—"} / {metric.denominator ?? "—"}
    </div>
  ) : null
}
function EffectValue({
  label,
  value,
}: {
  label: string
  value: { numerator: number; denominator: number; value: number | null }
}) {
  return (
    <div>
      <span className="font-extrabold">{label}</span>{" "}
      {value.value === null ? "—" : `${(value.value * 100).toFixed(1)}%`}
      <div className="text-[9px] font-semibold text-ink/38">
        {value.numerator}/{value.denominator}
      </div>
    </div>
  )
}
