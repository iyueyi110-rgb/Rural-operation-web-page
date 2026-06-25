"use client"

import { RefreshCw, ClipboardCheck } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, fetchAdminApi, nodeDisplayName } from "@admin/lib/admin-api"
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
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  villagerId?: string
  nodeId?: string
  scheduledDate?: string
  earnings: number
  villager?: VillagerRow | null
  node?: NodeRow | null
}

const taskTypes = ["farming", "guiding", "logistics", "maintenance", "service"] as const
const taskStatuses = ["pending", "accepted", "in_progress", "completed", "cancelled"] as const
const nextStatusMap: Record<TaskRow["status"], TaskRow["status"] | null> = {
  pending: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [villagers, setVillagers] = useState<VillagerRow[]>([])
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [selected, setSelected] = useState<TaskRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [filters, setFilters] = useState({ taskType: "", status: "", villagerId: "" })
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
      fetch(`${adminApiBase}/tasks${query.toString() ? `?${query}` : ""}`),
      fetch(`${adminApiBase}/villagers`),
      fetch(`${adminApiBase}/nodes`),
    ])
    const taskPayload = (await taskResponse.json()) as { data?: TaskRow[] }
    const villagerPayload = (await villagerResponse.json()) as { data?: VillagerRow[] }
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
    setForm({ title: "", description: "", taskType: "farming", villagerId: "", nodeId: "", scheduledDate: "", earnings: "0" })
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
      setMessage(`${adminCopy.tasks.saveFailed}: ${error instanceof Error ? error.message : ""}`)
    }
  }

  const columns = useMemo<Array<TableColumn<TaskRow>>>(
    () => [
      { key: "title", label: adminCopy.tasks.titleLabel },
      { key: "taskType", label: adminCopy.tasks.taskType, render: (value) => adminCopy.tasks.typeOptions[value as keyof typeof adminCopy.tasks.typeOptions] ?? String(value) },
      { key: "status", label: adminCopy.tasks.status, render: (value) => adminCopy.tasks.statusOptions[value as keyof typeof adminCopy.tasks.statusOptions] ?? String(value) },
      { key: "villager", label: adminCopy.tasks.villager, render: (_value, row) => row.villager?.name ?? adminCopy.tasks.unassigned },
      { key: "node", label: adminCopy.tasks.node, render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
      { key: "earnings", label: adminCopy.tasks.earnings, render: (value) => `¥${Number(value ?? 0).toFixed(0)}` },
    ],
    [],
  )

  const completedCount = tasks.filter((task) => task.status === "completed").length
  const totalEarnings = tasks.filter((task) => task.status === "completed").reduce((sum, task) => sum + task.earnings, 0)
  const nextStatus = selected ? nextStatusMap[selected.status] : null

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.tasks.subtitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.tasks.title}</h1>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold" onClick={loadData} type="button">
          <RefreshCw className="h-4 w-4" />
          {adminCopy.common.refresh}
        </button>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard icon={<ClipboardCheck className="h-4 w-4" />} label={adminCopy.tasks.title} value={isLoading ? "..." : tasks.length} />
        <AdminStatCard label={adminCopy.tasks.statusOptions.completed} value={completedCount} />
        <AdminStatCard label={adminCopy.tasks.earnings} value={`¥${totalEarnings.toFixed(0)}`} />
      </div>

      <section className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-3">
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setFilters({ ...filters, taskType: event.target.value })} value={filters.taskType}>
          <option value="">{adminCopy.tasks.allTypes}</option>
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {adminCopy.tasks.typeOptions[type]}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}>
          <option value="">{adminCopy.tasks.allStatuses}</option>
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {adminCopy.tasks.statusOptions[status]}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setFilters({ ...filters, villagerId: event.target.value })} value={filters.villagerId}>
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
            <div className="text-lg font-extrabold">{selected ? adminCopy.tasks.detail : adminCopy.tasks.create}</div>
            <button className="text-sm font-bold text-water" onClick={resetForm} type="button">{adminCopy.tasks.create}</button>
          </div>
          <div className="mt-4 grid gap-3">
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={adminCopy.tasks.titleLabel} value={form.title} />
            <textarea className="min-h-20 rounded-md border border-stone bg-rice px-3 py-2" onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={adminCopy.tasks.description} value={form.description} />
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, taskType: event.target.value })} value={form.taskType}>
              {taskTypes.map((type) => <option key={type} value={type}>{adminCopy.tasks.typeOptions[type]}</option>)}
            </select>
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, villagerId: event.target.value })} value={form.villagerId}>
              <option value="">{adminCopy.tasks.unassigned}</option>
              {villagers.map((villager) => <option key={villager.id} value={villager.id}>{villager.name}</option>)}
            </select>
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, nodeId: event.target.value })} value={form.nodeId}>
              <option value="">{adminCopy.tasks.node}</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{nodeDisplayName(node.slug, node.nameKey)}</option>)}
            </select>
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} type="date" value={form.scheduledDate} />
            <input className="h-10 rounded-md border border-stone bg-rice px-3" min={0} onChange={(event) => setForm({ ...form, earnings: event.target.value })} placeholder={adminCopy.tasks.earnings} type="number" value={form.earnings} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-10 rounded-full bg-ink px-5 text-sm font-bold text-white" onClick={() => saveTask()} type="button">
              {adminCopy.tasks.save}
            </button>
            {selected && nextStatus ? (
              <button className="h-10 rounded-full border border-stone px-5 text-sm font-bold text-ink" onClick={() => saveTask(nextStatus)} type="button">
                {adminCopy.tasks.statusOptions[nextStatus]}
              </button>
            ) : null}
            {selected && selected.status !== "completed" && selected.status !== "cancelled" ? (
              <button className="h-10 rounded-full border border-lychee px-5 text-sm font-bold text-lychee" onClick={() => saveTask("cancelled")} type="button">
                {adminCopy.tasks.statusOptions.cancelled}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
