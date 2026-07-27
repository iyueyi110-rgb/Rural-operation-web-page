import { RefreshCw, Save } from "lucide-react"

import {
  ActionButton,
  controlClass,
  labelClass,
  PolicyBadge,
  SectionHeading,
  SeverityBadge,
} from "./shared"
import {
  badCaseCategoryLabel,
  buildBadCasePolicyComparison,
  countBy,
  runLabel,
  type SimulationBadCase,
  type SimulationRun,
} from "./types"

export function BadCasesPanel({
  badCases,
  busyAction,
  onChange,
  onLoad,
  onSave,
  runId,
  runs,
  setRunId,
}: {
  badCases: SimulationBadCase[]
  busyAction: string
  onChange: (items: SimulationBadCase[]) => void
  onLoad: () => void
  onSave: (item: SimulationBadCase) => void
  runId: string
  runs: SimulationRun[]
  setRunId: (id: string) => void
}) {
  const summary = countBy(badCases, (item) => item.category ?? "未分类")
  const policyComparison = buildBadCasePolicyComparison(badCases)
  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="根因闭环"
            title="模拟 Bad Case 复盘"
            description="固定分类、事件链与严重度由引擎生成；产品经理补充根因和改进动作。"
          />
          <div className="flex gap-2">
            <select
              aria-label="模拟 Bad Case 运行筛选"
              className={controlClass}
              value={runId}
              onChange={(event) => setRunId(event.target.value)}
            >
              <option value="">全部模拟运行</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {runLabel(run)}
                </option>
              ))}
            </select>
            <ActionButton
              disabled={busyAction === "bad-cases"}
              icon={<RefreshCw className="h-4 w-4" />}
              label="加载复盘"
              onClick={onLoad}
              compact
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(summary).map(([category, count]) => (
            <span
              className="rounded-full border border-stone bg-rice px-3 py-1.5 text-xs font-extrabold"
              key={category}
            >
              {badCaseCategoryLabel(category)} · {count}
            </span>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
        <SectionHeading
          eyebrow="策略差异"
          title="模拟 V0/V1 分类数量对比"
          description="按固定 Bad Case 分类统计当前已载入的模拟记录。"
        />
        <div className="mt-4 grid gap-2">
          {policyComparison.map((row) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 rounded-lg bg-rice px-3 py-2 text-xs"
              key={row.category}
            >
              <span className="font-extrabold">{row.label}</span>
              <span className="text-center font-bold">V0 · {row.v0}</span>
              <span className="text-center font-bold text-water">
                V1 · {row.v1}
              </span>
            </div>
          ))}
          {!policyComparison.length ? (
            <p className="text-sm font-semibold text-ink/42">
              加载全部模拟运行后显示分类数量对比。
            </p>
          ) : null}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        {badCases.map((item, index) => (
          <article
            className="rounded-xl border border-stone bg-white p-5 shadow-soft"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={item.severity} />
                  {item.policyVersion ? (
                    <PolicyBadge version={item.policyVersion} />
                  ) : null}
                  <span className="text-xs font-bold text-ink/42">
                    {badCaseCategoryLabel(item.category)}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-extrabold">
                  {item.title ?? `模拟异常案例 ${index + 1}`}
                </h3>
              </div>
              <span className="font-mono text-[10px] text-ink/35">
                {item.taskId ?? item.id}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/58">
              {item.description ?? "通过关联事件链查看该模拟异常的触发过程。"}
            </p>
            <div className="mt-3 rounded-lg bg-rice p-3 text-xs font-semibold text-ink/52">
              模拟事件链：
              {item.eventIds?.length
                ? item.eventIds.join(" → ")
                : "由运行详情追溯"}
            </div>
            <label className="mt-4 block">
              <span className={labelClass}>模拟根因</span>
              <textarea
                className={`${controlClass} mt-1.5 min-h-20 w-full py-2`}
                placeholder="记录规则、容量或流程根因"
                value={item.rootCause ?? ""}
                onChange={(event) =>
                  onChange(
                    badCases.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, rootCause: event.target.value }
                        : candidate,
                    ),
                  )
                }
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>模拟改进动作</span>
              <textarea
                className={`${controlClass} mt-1.5 min-h-20 w-full py-2`}
                placeholder="记录下一轮可验证的规则调整"
                value={item.improvementAction ?? ""}
                onChange={(event) =>
                  onChange(
                    badCases.map((candidate) =>
                      candidate.id === item.id
                        ? {
                            ...candidate,
                            improvementAction: event.target.value,
                          }
                        : candidate,
                    ),
                  )
                }
              />
            </label>
            <button
              className="mt-4 flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white disabled:opacity-50"
              disabled={busyAction === `bad-case:${item.id}`}
              onClick={() => onSave(item)}
              type="button"
            >
              <Save className="h-4 w-4" />
              保存模拟复盘
            </button>
          </article>
        ))}
        {!badCases.length ? (
          <div className="rounded-xl border border-dashed border-stone bg-white p-12 text-center font-bold text-ink/42 xl:col-span-2">
            暂无模拟 Bad Case。选择运行并加载复盘。
          </div>
        ) : null}
      </div>
    </div>
  )
}
