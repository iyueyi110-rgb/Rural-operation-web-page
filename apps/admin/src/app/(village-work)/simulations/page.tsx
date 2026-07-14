"use client"

import { ChevronRight, Download, ShieldCheck } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { BadCasesPanel } from "@admin/components/simulation/bad-cases-panel"
import { ComparisonPanel } from "@admin/components/simulation/comparison-panel"
import { DetailPanel } from "@admin/components/simulation/detail-panel"
import { EventsPanel } from "@admin/components/simulation/events-panel"
import { RunsPanel } from "@admin/components/simulation/runs-panel"
import {
  ActionButton,
  controlClass,
  MetaCell,
  Notice,
} from "@admin/components/simulation/shared"
import {
  exportArtifacts,
  metricsFromRun,
  normalizeRuns,
  resolveSelectedRun,
  type ComparisonResult,
  type SimulationBadCase,
  type SimulationEvent,
  type SimulationRun,
} from "@admin/components/simulation/types"
import { fetchAdminApi } from "@admin/lib/admin-api"
import {
  asRecord,
  buildSimulationFilters,
  defaultSimulationConfig,
  normalizeSimulationList,
  unwrapData,
  type EventFilters,
  type SimulationConfigForm,
} from "@admin/lib/simulation-admin"

type TabId = "runs" | "detail" | "comparison" | "events" | "badCases"

const tabs: Array<{ id: TabId; label: string; short: string }> = [
  { id: "runs", label: "模拟配置与运行", short: "配置" },
  { id: "detail", label: "模拟运行详情", short: "详情" },
  { id: "comparison", label: "模拟 V0/V1 对比", short: "对比" },
  { id: "events", label: "模拟事件日志", short: "事件" },
  { id: "badCases", label: "模拟 Bad Case", short: "复盘" },
]

const simulationDisclaimer = "模拟运营数据，不代表真实业务结果"
const emptyEventFilters: EventFilters = {
  runId: "",
  adoptionId: "",
  taskId: "",
  actorId: "",
  actorType: "",
  eventType: "",
  policyVersion: "",
  startTime: "",
  endTime: "",
}
interface SimulationApiMeta {
  degraded: boolean
  backend: string
  reason: string
}

export default function SimulationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("runs")
  const [config, setConfig] = useState<SimulationConfigForm>({
    ...defaultSimulationConfig,
  })
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [badCases, setBadCases] = useState<SimulationBadCase[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [comparisonIds, setComparisonIds] = useState({
    v0RunId: "",
    v1RunId: "",
  })
  const [eventFilters, setEventFilters] = useState<EventFilters>({
    ...emptyEventFilters,
  })
  const [selectedArtifact, setSelectedArtifact] = useState(
    exportArtifacts.at(-1) ?? "simulation_report.md",
  )
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [meta, setMeta] = useState<SimulationApiMeta>({
    degraded: false,
    backend: "未报告",
    reason: "",
  })

  const loadRuns = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const payload = await fetchAdminApi<unknown>(
        "/simulations/runs?page=1&pageSize=50",
      )
      captureMeta(payload)
      const nextRuns = normalizeRuns(payload)
      setRuns(nextRuns)
      setSelectedRun((current) => resolveSelectedRun(current, nextRuns))
      const v0 = nextRuns.find(
        (run) => run.policyVersion === "V0" && !run.archivedAt,
      )
      const v1 = nextRuns.find(
        (run) =>
          run.policyVersion === "V1" &&
          !run.archivedAt &&
          (!v0?.worldHash || run.worldHash === v0.worldHash),
      )
      setComparisonIds((current) => ({
        v0RunId: nextRuns.some(
          (run) => run.id === current.v0RunId && run.policyVersion === "V0",
        )
          ? current.v0RunId
          : (v0?.id ?? ""),
        v1RunId: nextRuns.some(
          (run) => run.id === current.v1RunId && run.policyVersion === "V1",
        )
          ? current.v1RunId
          : (v1?.id ?? ""),
      }))
    } catch (caughtError) {
      console.warn("Simulation run data load failed", caughtError)
      setRuns([])
      setMeta({
        degraded: true,
        backend: "不可用",
        reason: errorMessage(caughtError, "模拟 API 连接失败"),
      })
      setError("模拟服务暂不可用。可继续调整配置，服务恢复后重新运行。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  async function createRuns() {
    setBusyAction("create")
    clearNotices()
    try {
      const startAt = new Date(Date.UTC(2026, 6, 1)).toISOString()
      const apiConfig = {
        seed: config.seed,
        durationDays: config.durationDays,
        adoptionCount: config.adoptionCount,
        treeCount: config.treeCount,
        villagerCount: config.villagerCount,
        reviewerCount: config.reviewerCount,
        tasksPerAdoption: {
          min: config.minTasksPerAdoption,
          max: config.maxTasksPerAdoption,
        },
        scenario: config.scenarioId,
        startAt,
        weatherEnabled: config.weatherEnabled,
        anomalyEnabled: config.anomaliesEnabled,
      }
      const payload = await fetchAdminApi<unknown>("/simulations/runs", {
        method: "POST",
        body: JSON.stringify({
          config: apiConfig,
          policyVersions: ["V0", "V1"],
        }),
      })
      captureMeta(payload)
      const created = normalizeRuns(payload)
      setMessage(
        `模拟运行已创建${created.length ? `：${created.map(runLabel).join(" / ")}` : "，正在排队执行"}`,
      )
      await loadRuns()
    } catch (caughtError) {
      setError(errorMessage(caughtError, "创建模拟运行失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function openRun(run: SimulationRun) {
    setBusyAction(`detail:${run.id}`)
    clearNotices()
    try {
      const payload = await fetchAdminApi<unknown>(
        `/simulations/runs/${run.id}`,
      )
      captureMeta(payload)
      const detail = normalizeRuns(payload)[0] ?? run
      setSelectedRun(detail)
      setEventFilters((current) => ({ ...current, runId: run.id }))
      setActiveTab("detail")
      await Promise.all([
        loadEvents({ ...eventFilters, runId: run.id }, false),
        loadBadCases(run.id, false),
      ])
    } catch (caughtError) {
      setSelectedRun(run)
      setActiveTab("detail")
      setError(
        errorMessage(caughtError, "模拟运行详情加载失败，当前显示列表摘要"),
      )
    } finally {
      setBusyAction("")
    }
  }

  async function archiveRun(run: SimulationRun) {
    if (!window.confirm(`归档模拟运行 ${runLabel(run)}？历史证据不会被删除。`))
      return
    setBusyAction(`archive:${run.id}`)
    clearNotices()
    try {
      const payload = await fetchAdminApi<unknown>(
        `/simulations/runs/${run.id}`,
        { method: "DELETE" },
      )
      captureMeta(payload)
      setMessage("模拟运行已归档，历史事件仍可追溯。")
      await loadRuns()
    } catch (caughtError) {
      setError(errorMessage(caughtError, "归档模拟运行失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function cloneRun(run: SimulationRun) {
    setBusyAction(`clone:${run.id}`)
    clearNotices()
    try {
      const payload = await fetchAdminApi<unknown>(
        `/simulations/runs/${run.id}/clone`,
        { method: "POST" },
      )
      captureMeta(payload)
      setMessage("已复制模拟配置并创建新的不可变运行。")
      await loadRuns()
    } catch (caughtError) {
      setError(errorMessage(caughtError, "复制模拟运行失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function compareRuns() {
    if (!comparisonIds.v0RunId || !comparisonIds.v1RunId) {
      setError("请选择 V0 与 V1 两个模拟运行。")
      return
    }
    setBusyAction("compare")
    clearNotices()
    try {
      const [v0Payload, v1Payload, payload] = await Promise.all([
        fetchAdminApi<unknown>(`/simulations/runs/${comparisonIds.v0RunId}`),
        fetchAdminApi<unknown>(`/simulations/runs/${comparisonIds.v1RunId}`),
        fetchAdminApi<unknown>("/simulations/comparisons", {
          method: "POST",
          body: JSON.stringify(comparisonIds),
        }),
      ])
      const detailedPair = [
        ...normalizeRuns(v0Payload),
        ...normalizeRuns(v1Payload),
      ]
      setRuns((current) =>
        current.map(
          (run) => detailedPair.find((detail) => detail.id === run.id) ?? run,
        ),
      )
      captureMeta(payload)
      setComparison(unwrapData<ComparisonResult>(payload))
      setActiveTab("comparison")
    } catch (caughtError) {
      setError(
        errorMessage(
          caughtError,
          "模拟对比失败；仅相同种子、场景、配置与世界哈希可归因",
        ),
      )
    } finally {
      setBusyAction("")
    }
  }

  async function loadEvents(filters = eventFilters, switchTab = true) {
    setBusyAction("events")
    clearNotices()
    try {
      const query = buildSimulationFilters(filters)
      const payload = await fetchAdminApi<unknown>(
        `/simulations/events?${query}`,
      )
      captureMeta(payload)
      setEvents(normalizeSimulationList<SimulationEvent>(payload))
      if (switchTab) setActiveTab("events")
    } catch (caughtError) {
      setEvents([])
      setError(errorMessage(caughtError, "模拟事件加载失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function loadBadCases(runId = eventFilters.runId, switchTab = true) {
    setBusyAction("bad-cases")
    clearNotices()
    try {
      const query = new URLSearchParams(runId ? { runId } : {})
      const payload = await fetchAdminApi<unknown>(
        `/simulations/bad-cases?${query}`,
      )
      captureMeta(payload)
      setBadCases(normalizeSimulationList<SimulationBadCase>(payload))
      if (switchTab) setActiveTab("badCases")
    } catch (caughtError) {
      setBadCases([])
      setError(errorMessage(caughtError, "模拟 Bad Case 加载失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function saveBadCase(item: SimulationBadCase) {
    setBusyAction(`bad-case:${item.id}`)
    clearNotices()
    try {
      const payload = await fetchAdminApi<unknown>("/simulations/bad-cases", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          rootCause: item.rootCause ?? "",
          improvementAction: item.improvementAction ?? "",
        }),
      })
      captureMeta(payload)
      setMessage("模拟 Bad Case 复盘已保存。")
    } catch (caughtError) {
      setError(errorMessage(caughtError, "保存模拟 Bad Case 复盘失败"))
    } finally {
      setBusyAction("")
    }
  }

  async function exportArtifact(artifact: string) {
    setBusyAction("export")
    clearNotices()
    const query = new URLSearchParams({
      ...(comparisonIds.v0RunId ? { v0RunId: comparisonIds.v0RunId } : {}),
      ...(comparisonIds.v1RunId ? { v1RunId: comparisonIds.v1RunId } : {}),
    })
    try {
      const payload = await fetchAdminApi<unknown>(
        `/simulations/exports/${artifact}?${query}`,
      )
      captureMeta(payload)
      downloadPayload(artifact, payload)
      setMessage(`模拟导出已生成：${artifact}`)
    } catch (caughtError) {
      setError(errorMessage(caughtError, "生成模拟导出失败"))
    } finally {
      setBusyAction("")
    }
  }

  function clearNotices() {
    setError("")
    setMessage("")
  }
  function captureMeta(payload: unknown) {
    const apiMeta = asRecord(asRecord(payload).meta)
    if (!Object.keys(apiMeta).length) return
    setMeta({
      degraded: apiMeta.degraded === true,
      backend: typeof apiMeta.backend === "string" ? apiMeta.backend : "未报告",
      reason: typeof apiMeta.reason === "string" ? apiMeta.reason : "",
    })
  }

  const selectedEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            !selectedRun ||
            (event.runId ?? event.simulationRunId) === selectedRun.id,
        )
        .slice(0, 12),
    [events, selectedRun],
  )
  const selectedBadCases = useMemo(
    () =>
      badCases.filter(
        (item) =>
          !selectedRun ||
          (item.runId ?? item.simulationRunId) === selectedRun.id,
      ),
    [badCases, selectedRun],
  )

  return (
    <main className="simulation-workbench grid gap-5">
      <header className="overflow-hidden rounded-2xl border border-canopy/20 bg-canopy text-white shadow-panel">
        <div className="admin-console-grid grid gap-6 px-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/62">
              <span>村民协作</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white">规则模拟</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              认养履约规则模拟实验台
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/64">
              在同一个固定世界中并行观察 V0 与
              V1，从任务分配到权益履约逐事件复盘。
            </p>
          </div>
          <div className="grid min-w-[320px] grid-cols-3 gap-px self-stretch overflow-hidden rounded-xl border border-white/12 bg-white/12">
            <MetaCell label="dataOrigin" value="simulation" />
            <MetaCell
              label="统计窗口"
              value={`${selectedRun?.config?.durationDays ?? config.durationDays} 天`}
            />
            <MetaCell
              label="模拟种子"
              value={String(
                selectedRun?.seed ?? selectedRun?.config?.seed ?? config.seed,
              )}
            />
            <MetaCell
              label="simulationRunId"
              value={
                selectedRun?.simulationRunId ?? selectedRun?.id ?? "未选择"
              }
            />
            <MetaCell
              label="policyVersion"
              value={selectedRun?.policyVersion ?? "V0 / V1"}
            />
            <MetaCell label="API backend" value={meta.backend} />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-black/10 px-5 py-3 text-xs font-bold text-[#f6d8a7] md:px-7">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {simulationDisclaimer}
        </div>
      </header>
      {meta.degraded ? (
        <Notice
          tone="error"
          text={`模拟数据仓库处于降级模式 · backend: ${meta.backend} · reason: ${meta.reason || "未提供"}`}
        />
      ) : null}
      <nav
        aria-label="规则模拟页面"
        className="flex gap-1 overflow-x-auto rounded-xl border border-stone bg-white p-1.5 shadow-soft"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`simulation-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id
                ? "min-w-fit flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-extrabold text-white"
                : "min-w-fit flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-ink/52 transition hover:bg-rice hover:text-ink"
            }
            id={`simulation-tab-${tab.id}`}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id === "badCases") {
                setEventFilters((current) => ({ ...current, runId: "" }))
                void loadBadCases("", false)
              }
            }}
            role="tab"
            type="button"
          >
            <span className="hidden md:inline">{tab.label}</span>
            <span className="md:hidden">{tab.short}</span>
          </button>
        ))}
      </nav>
      {error ? <Notice tone="error" text={error} /> : null}
      {message ? <Notice tone="success" text={message} /> : null}
      <section
        aria-labelledby={`simulation-tab-${activeTab}`}
        id={`simulation-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab === "runs" ? (
          <RunsPanel
            busyAction={busyAction}
            config={config}
            isLoading={isLoading}
            onArchive={archiveRun}
            onChange={setConfig}
            onClone={cloneRun}
            onCreate={createRuns}
            onOpen={openRun}
            onRefresh={loadRuns}
            runs={runs}
          />
        ) : null}
        {activeTab === "detail" ? (
          <DetailPanel
            badCases={selectedBadCases}
            events={selectedEvents}
            metrics={metricsFromRun(selectedRun)}
            onLoadBadCases={() => loadBadCases(selectedRun?.id)}
            onLoadEvents={() =>
              loadEvents({ ...eventFilters, runId: selectedRun?.id ?? "" })
            }
            run={selectedRun}
          />
        ) : null}
        {activeTab === "comparison" ? (
          <ComparisonPanel
            busy={busyAction === "compare"}
            comparison={comparison}
            ids={comparisonIds}
            onChange={setComparisonIds}
            onCompare={compareRuns}
            runs={runs}
          />
        ) : null}
        {activeTab === "events" ? (
          <EventsPanel
            busy={busyAction === "events"}
            events={events}
            filters={eventFilters}
            onChange={setEventFilters}
            onLoad={() => loadEvents()}
            runs={runs}
          />
        ) : null}
        {activeTab === "badCases" ? (
          <BadCasesPanel
            badCases={badCases}
            busyAction={busyAction}
            onChange={setBadCases}
            onLoad={() => loadBadCases()}
            onSave={saveBadCase}
            runId={eventFilters.runId}
            runs={runs}
            setRunId={(runId) =>
              setEventFilters((current) => ({ ...current, runId }))
            }
          />
        ) : null}
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-stone bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-extrabold">模拟证据导出</div>
          <p className="mt-1 text-xs font-semibold text-ink/48">
            导出文件自动携带运行、种子、策略版本与数据真实性声明。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="模拟导出文件"
            className={controlClass}
            onChange={(event) => setSelectedArtifact(event.target.value)}
            value={selectedArtifact}
          >
            {exportArtifacts.map((artifact) => (
              <option key={artifact}>{artifact}</option>
            ))}
          </select>
          <ActionButton
            disabled={busyAction === "export"}
            icon={<Download className="h-4 w-4" />}
            label="导出模拟证据"
            onClick={() => exportArtifact(selectedArtifact)}
          />
        </div>
      </section>
    </main>
  )
}

function runLabel(run: SimulationRun) {
  return `${run.policyVersion} · ${run.simulationRunId ?? run.id}`
}
function errorMessage(error: unknown, prefix: string) {
  return `${prefix}：${error instanceof Error ? error.message : "未知错误"}`
}
function downloadPayload(filename: string, payload: unknown) {
  const record = asRecord(payload)
  const data = "data" in record ? record.data : payload
  const content =
    typeof data === "string" ? data : JSON.stringify(data, null, 2)
  const blob = new Blob([content], {
    type: filename.endsWith(".csv")
      ? "text/csv;charset=utf-8"
      : filename.endsWith(".md")
        ? "text/markdown;charset=utf-8"
        : "application/json;charset=utf-8",
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(href)
}
