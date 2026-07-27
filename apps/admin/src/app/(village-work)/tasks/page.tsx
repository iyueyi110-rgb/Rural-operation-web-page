"use client"

import { RefreshCw, ClipboardCheck } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  AdminDataTable,
  type TableColumn,
} from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import {
  adminApiBase,
  fetchAdminApi,
  fetchWithTimeout,
  nodeDisplayName,
} from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface NodeRow {
  id: string
  slug: string
  nameKey: string
}

interface VillagerRow {
  id: string
  name: string
}

interface TaskRow extends Record<string, unknown> {
  id: string
  title: string
  description?: string
  taskType: "farming" | "guiding" | "logistics" | "maintenance" | "service"
  status:
    | "pending"
    | "accepted"
    | "in_progress"
    | "submitted"
    | "rejected"
    | "resubmitted"
    | "approved"
    | "settled"
    | "exception_reported"
    | "overdue"
    | "completed"
    | "cancelled"
  adoptionId?: string
  treeId?: string
  version?: number
  villagerId?: string
  nodeId?: string
  scheduledDate?: string
  earnings: number
  villager?: VillagerRow | null
  node?: NodeRow | null
}

interface EvidenceRow {
  id: string
  description: string
  mediaJson: Array<{ url?: string }>
  version: number
  status: string
  submittedAt: string
  reviews: Array<{
    id: string
    decision: string
    reasonCode?: string
    note?: string
  }>
}

const taskTypes = [
  "farming",
  "guiding",
  "logistics",
  "maintenance",
  "service",
] as const
const taskStatuses = [
  "pending",
  "accepted",
  "in_progress",
  "submitted",
  "rejected",
  "resubmitted",
  "approved",
  "settled",
  "exception_reported",
  "overdue",
  "completed",
  "cancelled",
] as const
const nextStatusMap: Record<TaskRow["status"], TaskRow["status"] | null> = {
  pending: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
  submitted: null,
  rejected: null,
  resubmitted: null,
  approved: null,
  settled: null,
  exception_reported: null,
  overdue: null,
  completed: null,
  cancelled: null,
}
const webAppBase = (
  process.env.NEXT_PUBLIC_WEB_API_BASE ?? "http://localhost:3000/api/v1"
).replace(/\/api\/v1\/?$/u, "")

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [villagers, setVillagers] = useState<VillagerRow[]>([])
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [selected, setSelected] = useState<TaskRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [evidence, setEvidence] = useState<EvidenceRow[]>([])
  const [reviewReason, setReviewReason] = useState("")
  const [filters, setFilters] = useState({
    taskType: "",
    status: "",
    villagerId: "",
  })
  const [form, setForm] = useState({
    title: "",
    description: "",
    taskType: "farming",
    villagerId: "",
    nodeId: "",
    scheduledDate: "",
    earnings: "0",
  })

  async function loadData() {
    setIsLoading(true)
    const query = new URLSearchParams()
    if (filters.taskType) query.set("taskType", filters.taskType)
    if (filters.status) query.set("status", filters.status)
    if (filters.villagerId) query.set("villagerId", filters.villagerId)

    const [taskResponse, villagerResponse, nodeResponse] = await Promise.all([
      fetchWithTimeout(
        `${adminApiBase}/tasks${query.toString() ? `?${query}` : ""}`,
      ),
      fetchWithTimeout(`${adminApiBase}/villagers`),
      fetchWithTimeout(`${adminApiBase}/nodes`),
    ])
    const taskPayload = (await taskResponse.json()) as { data?: TaskRow[] }
    const villagerPayload = (await villagerResponse.json()) as {
      data?: VillagerRow[]
    }
    const nodePayload = (await nodeResponse.json()) as { data?: NodeRow[] }
    setTasks(taskPayload.data ?? [])
    setVillagers(villagerPayload.data ?? [])
    setNodes(nodePayload.data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.taskType, filters.status, filters.villagerId])

  function resetForm() {
    setSelected(null)
    setForm({
      title: "",
      description: "",
      taskType: "farming",
      villagerId: "",
      nodeId: "",
      scheduledDate: "",
      earnings: "0",
    })
  }

  function selectTask(row: TaskRow) {
    setSelected(row)
    setForm({
      title: row.title,
      description: row.description ?? "",
      taskType: row.taskType,
      villagerId: row.villagerId ?? "",
      nodeId: row.nodeId ?? "",
      scheduledDate: row.scheduledDate ?? "",
      earnings: String(row.earnings),
    })
    if (row.adoptionId) {
      void fetchAdminApi<{ data: EvidenceRow[] }>(
        `/fulfillment/evidence?taskId=${encodeURIComponent(row.id)}`,
      )
        .then((payload) => setEvidence(payload.data ?? []))
        .catch(() => setEvidence([]))
    } else setEvidence([])
  }

  async function reviewEvidence(decision: "approve" | "reject") {
    const latest = evidence[0]
    if (!latest) return
    if (decision === "reject" && !reviewReason.trim()) {
      setMessage("退回凭证前请填写原因。")
      return
    }
    try {
      await fetchAdminApi("/fulfillment/reviews", {
        method: "POST",
        body: JSON.stringify({
          evidenceId: latest.id,
          decision,
          reasonCode: decision === "reject" ? "evidence_incomplete" : undefined,
          note: reviewReason.trim() || undefined,
        }),
      })
      setMessage(
        decision === "approve" ? "履约凭证已通过。" : "履约凭证已退回。",
      )
      setReviewReason("")
      await loadData()
      setSelected(null)
      setEvidence([])
    } catch (error) {
      setMessage(
        `审核失败：${error instanceof Error ? error.message : "请稍后重试"}`,
      )
    }
  }

  async function saveTask(status?: TaskRow["status"]) {
    try {
      await fetchAdminApi("/tasks", {
        method: selected ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(selected ? { id: selected.id } : {}),
          ...form,
          status,
          villagerId: form.villagerId || null,
          nodeId: form.nodeId || null,
          earnings: Number(form.earnings),
        }),
      })
      setMessage(adminCopy.tasks.saved)
      await loadData()
      resetForm()
    } catch (error) {
      setMessage(
        `${adminCopy.tasks.saveFailed}: ${error instanceof Error ? error.message : ""}`,
      )
    }
  }

  const columns = useMemo<Array<TableColumn<TaskRow>>>(
    () => [
      { key: "title", label: adminCopy.tasks.titleLabel },
      {
        key: "taskType",
        label: adminCopy.tasks.taskType,
        render: (value) =>
          adminCopy.tasks.typeOptions[
            value as keyof typeof adminCopy.tasks.typeOptions
          ] ?? String(value),
      },
      {
        key: "status",
        label: adminCopy.tasks.status,
        render: (value) =>
          adminCopy.tasks.statusOptions[
            value as keyof typeof adminCopy.tasks.statusOptions
          ] ?? String(value),
      },
      {
        key: "villager",
        label: adminCopy.tasks.villager,
        render: (_value, row) =>
          row.villager?.name ?? adminCopy.tasks.unassigned,
      },
      {
        key: "node",
        label: adminCopy.tasks.node,
        render: (_value, row) =>
          nodeDisplayName(row.node?.slug, row.node?.nameKey),
      },
      {
        key: "earnings",
        label: adminCopy.tasks.earnings,
        render: (value) => `¥${Number(value ?? 0).toFixed(0)}`,
      },
    ],
    [],
  )

  const completedCount = tasks.filter((task) =>
    ["completed", "approved", "settled"].includes(task.status),
  ).length
  const totalEarnings = tasks
    .filter((task) =>
      ["completed", "approved", "settled"].includes(task.status),
    )
    .reduce((sum, task) => sum + task.earnings, 0)
  const nextStatus =
    selected && !selected.adoptionId ? nextStatusMap[selected.status] : null

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">
            {adminCopy.tasks.subtitle}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">
            {adminCopy.tasks.title}
          </h1>
        </div>
        <button
          className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold"
          onClick={loadData}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {adminCopy.common.refresh}
        </button>
      </header>

      {message ? (
        <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label={adminCopy.tasks.title}
          value={isLoading ? "..." : tasks.length}
        />
        <AdminStatCard
          label={adminCopy.tasks.statusOptions.completed}
          value={completedCount}
        />
        <AdminStatCard
          label={adminCopy.tasks.earnings}
          value={`¥${totalEarnings.toFixed(0)}`}
        />
      </div>

      <section className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-3">
        <select
          className="h-10 rounded-md border border-stone bg-rice px-3"
          onChange={(event) =>
            setFilters({ ...filters, taskType: event.target.value })
          }
          value={filters.taskType}
        >
          <option value="">{adminCopy.tasks.allTypes}</option>
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {adminCopy.tasks.typeOptions[type]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-stone bg-rice px-3"
          onChange={(event) =>
            setFilters({ ...filters, status: event.target.value })
          }
          value={filters.status}
        >
          <option value="">{adminCopy.tasks.allStatuses}</option>
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {adminCopy.tasks.statusOptions[status]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-stone bg-rice px-3"
          onChange={(event) =>
            setFilters({ ...filters, villagerId: event.target.value })
          }
          value={filters.villagerId}
        >
          <option value="">{adminCopy.tasks.villager}</option>
          {villagers.map((villager) => (
            <option key={villager.id} value={villager.id}>
              {villager.name}
            </option>
          ))}
        </select>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <AdminDataTable
          columns={columns}
          emptyLabel={adminCopy.tasks.noData}
          isLoading={isLoading}
          onRowClick={selectTask}
          rows={tasks}
          selectedId={selected?.id}
        />

        <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold">
              {selected ? adminCopy.tasks.detail : adminCopy.tasks.create}
            </div>
            <button
              className="text-sm font-bold text-water"
              onClick={resetForm}
              type="button"
            >
              {adminCopy.tasks.create}
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {selected?.adoptionId ? (
              <div className="rounded-md border border-moss/20 bg-moss/5 p-3 text-xs font-bold text-moss">
                认养履约任务 · {selected.adoptionId}
              </div>
            ) : null}
            <input
              className="h-10 rounded-md border border-stone bg-rice px-3"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder={adminCopy.tasks.titleLabel}
              value={form.title}
            />
            <textarea
              className="min-h-20 rounded-md border border-stone bg-rice px-3 py-2"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder={adminCopy.tasks.description}
              value={form.description}
            />
            <select
              className="h-10 rounded-md border border-stone bg-rice px-3"
              onChange={(event) =>
                setForm({ ...form, taskType: event.target.value })
              }
              value={form.taskType}
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {adminCopy.tasks.typeOptions[type]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-stone bg-rice px-3"
              onChange={(event) =>
                setForm({ ...form, villagerId: event.target.value })
              }
              value={form.villagerId}
            >
              <option value="">{adminCopy.tasks.unassigned}</option>
              {villagers.map((villager) => (
                <option key={villager.id} value={villager.id}>
                  {villager.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-stone bg-rice px-3"
              onChange={(event) =>
                setForm({ ...form, nodeId: event.target.value })
              }
              value={form.nodeId}
            >
              <option value="">{adminCopy.tasks.node}</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {nodeDisplayName(node.slug, node.nameKey)}
                </option>
              ))}
            </select>
            <input
              className="h-10 rounded-md border border-stone bg-rice px-3"
              onChange={(event) =>
                setForm({ ...form, scheduledDate: event.target.value })
              }
              type="date"
              value={form.scheduledDate}
            />
            <input
              className="h-10 rounded-md border border-stone bg-rice px-3"
              min={0}
              onChange={(event) =>
                setForm({ ...form, earnings: event.target.value })
              }
              placeholder={adminCopy.tasks.earnings}
              type="number"
              value={form.earnings}
            />
          </div>

          {selected?.adoptionId && evidence.length ? (
            <div className="mt-5 border-t border-stone pt-4">
              <div className="font-extrabold">
                履约凭证 v{evidence[0]!.version}
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                {evidence[0]!.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {evidence[0]!.mediaJson.map((media, index) =>
                  media.url ? (
                    <a
                      className="text-sm font-bold text-water underline"
                      href={`${webAppBase}${media.url}`}
                      key={media.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      查看图片 {index + 1}
                    </a>
                  ) : null,
                )}
              </div>
              {evidence[0]!.status === "submitted" ? (
                <div className="mt-3 grid gap-2">
                  <textarea
                    className="min-h-20 rounded-md border border-stone bg-rice px-3 py-2 text-sm"
                    onChange={(event) => setReviewReason(event.target.value)}
                    placeholder="审核意见；退回时必填"
                    value={reviewReason}
                  />
                  <div className="flex gap-2">
                    <button
                      className="h-10 rounded-full bg-moss px-5 text-sm font-bold text-white"
                      onClick={() => void reviewEvidence("approve")}
                      type="button"
                    >
                      审核通过
                    </button>
                    <button
                      className="h-10 rounded-full border border-lychee px-5 text-sm font-bold text-lychee"
                      onClick={() => void reviewEvidence("reject")}
                      type="button"
                    >
                      退回补充
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="h-10 rounded-full bg-ink px-5 text-sm font-bold text-white"
              onClick={() => saveTask()}
              type="button"
            >
              {adminCopy.tasks.save}
            </button>
            {selected && nextStatus ? (
              <button
                className="h-10 rounded-full border border-stone px-5 text-sm font-bold text-ink"
                onClick={() => saveTask(nextStatus)}
                type="button"
              >
                {adminCopy.tasks.statusOptions[nextStatus]}
              </button>
            ) : null}
            {selected &&
            !selected.adoptionId &&
            selected.status !== "completed" &&
            selected.status !== "cancelled" ? (
              <button
                className="h-10 rounded-full border border-lychee px-5 text-sm font-bold text-lychee"
                onClick={() => saveTask("cancelled")}
                type="button"
              >
                {adminCopy.tasks.statusOptions.cancelled}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
