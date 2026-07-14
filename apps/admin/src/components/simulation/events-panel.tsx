import { RefreshCw } from "lucide-react"

import { displayDate, type EventFilters } from "@admin/lib/simulation-admin"
import {
  ActionButton,
  controlClass,
  PolicyBadge,
  SectionHeading,
  tdClass,
  thClass,
} from "./shared"
import {
  actorTypeLabel,
  eventTypeLabels,
  runLabel,
  type SimulationEvent,
  type SimulationRun,
} from "./types"

export function EventsPanel({
  busy,
  events,
  filters,
  onChange,
  onLoad,
  runs,
}: {
  busy: boolean
  events: SimulationEvent[]
  filters: EventFilters
  onChange: (filters: EventFilters) => void
  onLoad: () => void
  runs: SimulationRun[]
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone bg-white shadow-soft">
      <div className="border-b border-stone p-5">
        <SectionHeading
          eyebrow="不可变日志"
          title="模拟事件日志"
          description="按运行、认养、任务、参与者、事件、版本与时间追溯状态变化。"
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select
            aria-label="模拟运行筛选"
            className={controlClass}
            value={filters.runId}
            onChange={(event) =>
              onChange({ ...filters, runId: event.target.value })
            }
          >
            <option value="">全部模拟运行</option>
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {runLabel(run)}
              </option>
            ))}
          </select>
          <input
            aria-label="模拟认养 ID 筛选"
            className={controlClass}
            placeholder="模拟认养 ID"
            value={filters.adoptionId}
            onChange={(event) =>
              onChange({ ...filters, adoptionId: event.target.value })
            }
          />
          <input
            aria-label="模拟任务 ID 筛选"
            className={controlClass}
            placeholder="模拟任务 ID"
            value={filters.taskId}
            onChange={(event) =>
              onChange({ ...filters, taskId: event.target.value })
            }
          />
          <input
            aria-label="模拟参与者 ID 筛选"
            className={controlClass}
            placeholder="模拟参与者 ID"
            value={filters.actorId}
            onChange={(event) =>
              onChange({ ...filters, actorId: event.target.value })
            }
          />
          <select
            aria-label="模拟参与者类型筛选"
            className={controlClass}
            value={filters.actorType}
            onChange={(event) =>
              onChange({ ...filters, actorType: event.target.value })
            }
          >
            <option value="">全部模拟参与者类型</option>
            <option value="villager">村民</option>
            <option value="reviewer">审核员</option>
            <option value="operator">运营人员</option>
            <option value="system">规则系统</option>
          </select>
          <input
            aria-label="模拟事件类型筛选"
            className={controlClass}
            placeholder="模拟事件类型"
            value={filters.eventType}
            onChange={(event) =>
              onChange({ ...filters, eventType: event.target.value })
            }
          />
          <select
            aria-label="模拟策略版本筛选"
            className={controlClass}
            value={filters.policyVersion}
            onChange={(event) =>
              onChange({ ...filters, policyVersion: event.target.value })
            }
          >
            <option value="">全部模拟策略</option>
            <option>V0</option>
            <option>V1</option>
          </select>
          <input
            aria-label="模拟事件开始时间"
            className={controlClass}
            type="datetime-local"
            value={filters.startTime}
            onChange={(event) =>
              onChange({ ...filters, startTime: event.target.value })
            }
          />
          <input
            aria-label="模拟事件结束时间"
            className={controlClass}
            type="datetime-local"
            value={filters.endTime}
            onChange={(event) =>
              onChange({ ...filters, endTime: event.target.value })
            }
          />
          <div className="flex justify-end xl:col-span-4">
            <ActionButton
              disabled={busy}
              icon={
                <RefreshCw
                  className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
                />
              }
              label="查询模拟事件"
              onClick={onLoad}
              compact
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-rice/80 text-xs font-extrabold text-ink/48">
            <tr>
              <th className={thClass}>模拟时间</th>
              <th className={thClass}>模拟事件</th>
              <th className={thClass}>策略</th>
              <th className={thClass}>认养 / 任务</th>
              <th className={thClass}>参与者</th>
              <th className={thClass}>状态变化</th>
              <th className={thClass}>事件数据</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr className="border-t border-stone/70 align-top" key={event.id}>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {displayDate(event.occurredAt ?? event.timestamp)}
                </td>
                <td className={`${tdClass} font-extrabold`}>
                  {eventTypeLabels[event.eventType ?? ""] ??
                    event.eventType ??
                    "未知模拟事件"}
                  <div className="mt-1 font-mono text-[10px] font-normal text-ink/35">
                    {event.id}
                  </div>
                </td>
                <td className={tdClass}>
                  {event.policyVersion ? (
                    <PolicyBadge version={event.policyVersion} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${tdClass} text-xs`}>
                  <div>{event.adoptionId ?? "—"}</div>
                  <div className="mt-1 text-ink/45">{event.taskId ?? "—"}</div>
                </td>
                <td className={`${tdClass} text-xs`}>
                  {actorTypeLabel(event.actorType)}
                  <div className="mt-1 text-ink/45">{event.actorId ?? "—"}</div>
                </td>
                <td className={tdClass}>
                  {event.fromStatus ||
                  event.toStatus ||
                  event.fromState ||
                  event.toState ? (
                    <span className="font-mono text-xs">
                      {event.fromStatus ?? event.fromState ?? "∅"} →{" "}
                      {event.toStatus ?? event.toState ?? "∅"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${tdClass} max-w-xs`}>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-[10px] text-ink/48">
                    {event.payload
                      ? JSON.stringify(event.payload, null, 2)
                      : "—"}
                  </pre>
                </td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td
                  className="px-5 py-16 text-center font-bold text-ink/42"
                  colSpan={7}
                >
                  没有符合条件的模拟事件。调整筛选条件后重新查询。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
