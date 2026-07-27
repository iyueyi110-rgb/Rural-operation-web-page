import {
  Archive,
  ChevronRight,
  Copy,
  GitCompareArrows,
  LoaderCircle,
  Play,
  RefreshCw,
} from "lucide-react"

import {
  displayDate,
  scenarioOptions,
  type SimulationConfigForm,
} from "@admin/lib/simulation-admin"
import {
  controlClass,
  IconButton,
  labelClass,
  PolicyBadge,
  SectionHeading,
  StatusBadge,
  tdClass,
  thClass,
} from "./shared"
import {
  runLabel,
  scenarioLabel,
  scenarioOf,
  type SimulationRun,
} from "./types"

export function RunsPanel({
  busyAction,
  config,
  isLoading,
  onArchive,
  onChange,
  onClone,
  onCreate,
  onOpen,
  onRefresh,
  runs,
}: {
  busyAction: string
  config: SimulationConfigForm
  isLoading: boolean
  onArchive: (run: SimulationRun) => void
  onChange: (config: SimulationConfigForm) => void
  onClone: (run: SimulationRun) => void
  onCreate: () => void
  onOpen: (run: SimulationRun) => void
  onRefresh: () => void
  runs: SimulationRun[]
}) {
  return (
    <div className="grid gap-5 2xl:grid-cols-[400px_minmax(0,1fr)]">
      <section className="rounded-xl border border-stone bg-white p-5 shadow-soft">
        <SectionHeading
          eyebrow="固定世界"
          title="模拟运行配置"
          description="默认创建共享世界的 V0/V1 成对运行；规则版本不能改变外生随机条件。"
        />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <NumberField
            label="模拟种子"
            value={config.seed}
            onChange={(seed) => onChange({ ...config, seed })}
          />
          <NumberField
            label="模拟统计窗口（天）"
            min={1}
            value={config.durationDays}
            onChange={(durationDays) => onChange({ ...config, durationDays })}
          />
          <NumberField
            label="模拟认养订单"
            min={1}
            value={config.adoptionCount}
            onChange={(adoptionCount) => onChange({ ...config, adoptionCount })}
          />
          <NumberField
            label="模拟果树"
            min={1}
            value={config.treeCount}
            onChange={(treeCount) => onChange({ ...config, treeCount })}
          />
          <NumberField
            label="模拟村民"
            min={1}
            value={config.villagerCount}
            onChange={(villagerCount) => onChange({ ...config, villagerCount })}
          />
          <NumberField
            label="模拟审核员"
            min={1}
            value={config.reviewerCount}
            onChange={(reviewerCount) => onChange({ ...config, reviewerCount })}
          />
          <NumberField
            label="每单最少模拟任务"
            min={1}
            value={config.minTasksPerAdoption}
            onChange={(minTasksPerAdoption) =>
              onChange({ ...config, minTasksPerAdoption })
            }
          />
          <NumberField
            label="每单最多模拟任务"
            min={config.minTasksPerAdoption}
            value={config.maxTasksPerAdoption}
            onChange={(maxTasksPerAdoption) =>
              onChange({ ...config, maxTasksPerAdoption })
            }
          />
        </div>
        <label className="mt-3 block">
          <span className={labelClass}>模拟场景</span>
          <select
            className={`${controlClass} mt-1.5 w-full`}
            onChange={(event) =>
              onChange({
                ...config,
                scenarioId: event.target
                  .value as SimulationConfigForm["scenarioId"],
              })
            }
            value={config.scenarioId}
          >
            {scenarioOptions.map((scenario) => (
              <option key={scenario.value} value={scenario.value}>
                {scenario.label} · {scenario.description}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Toggle
            checked={config.weatherEnabled}
            label="模拟天气事件"
            onChange={(weatherEnabled) =>
              onChange({ ...config, weatherEnabled })
            }
          />
          <Toggle
            checked={config.anomaliesEnabled}
            label="模拟异常事件"
            onChange={(anomaliesEnabled) =>
              onChange({ ...config, anomaliesEnabled })
            }
          />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-water/20 bg-water/5 p-3 text-xs font-bold text-water">
          <GitCompareArrows className="h-4 w-4 shrink-0" />
          模拟策略：V0 + V1 · 共用 worldHash
        </div>
        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-lychee px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(185,56,53,0.2)] disabled:opacity-50"
          disabled={busyAction === "create"}
          onClick={onCreate}
          type="button"
        >
          {busyAction === "create" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          一键运行 V0/V1 模拟对照
        </button>
      </section>
      <section className="min-w-0 rounded-xl border border-stone bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-stone px-5 py-4">
          <SectionHeading
            eyebrow="运行档案"
            title="模拟运行列表"
            description={`${runs.length} 个可追溯运行`}
            compact
          />
          <button
            aria-label="刷新模拟运行"
            className="rounded-full border border-stone p-2.5 text-ink/58 hover:bg-rice"
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-rice/80 text-xs font-extrabold text-ink/48">
              <tr>
                <th className={thClass}>模拟运行</th>
                <th className={thClass}>模拟策略</th>
                <th className={thClass}>模拟场景 / 种子</th>
                <th className={thClass}>worldHash</th>
                <th className={thClass}>状态</th>
                <th className={thClass}>操作</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  className="border-t border-stone/70 hover:bg-rice/45"
                  key={run.id}
                >
                  <td className={tdClass}>
                    <button
                      className="font-extrabold text-water hover:underline"
                      onClick={() => onOpen(run)}
                      type="button"
                    >
                      {run.simulationRunId ?? run.id}
                    </button>
                    <div className="mt-1 text-xs font-semibold text-ink/42">
                      {displayDate(run.startedAt ?? run.createdAt)}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <PolicyBadge version={run.policyVersion} />
                    <div className="mt-1 text-xs font-semibold text-ink/42">
                      {run.policyRevision ?? "规则初版"}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className="font-bold">
                      {scenarioLabel(scenarioOf(run))}
                    </div>
                    <div className="mt-1 text-xs text-ink/46">
                      seed {run.seed ?? run.config?.seed ?? "—"}
                    </div>
                  </td>
                  <td
                    className={`${tdClass} max-w-[150px] truncate font-mono text-xs`}
                    title={run.worldHash}
                  >
                    {run.worldHash?.slice(0, 12) ?? "—"}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge
                      status={run.archivedAt ? "archived" : run.status}
                    />
                  </td>
                  <td className={tdClass}>
                    <div className="flex gap-1">
                      <IconButton
                        label="查看模拟详情"
                        onClick={() => onOpen(run)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="复制模拟运行"
                        onClick={() => onClone(run)}
                      >
                        <Copy className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="归档模拟运行"
                        onClick={() => onArchive(run)}
                        tone="danger"
                      >
                        <Archive className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {!runs.length ? (
                <tr>
                  <td
                    className="px-5 py-16 text-center text-sm font-bold text-ink/42"
                    colSpan={6}
                  >
                    {isLoading
                      ? "正在读取模拟运行…"
                      : "尚无模拟运行。配置固定世界后，运行第一组 V0/V1 对照。"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function NumberField({
  label,
  min,
  onChange,
  value,
}: {
  label: string
  min?: number
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={`${controlClass} mt-1.5 w-full`}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  )
}
function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone bg-rice px-3 py-2.5 text-xs font-extrabold">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  )
}
