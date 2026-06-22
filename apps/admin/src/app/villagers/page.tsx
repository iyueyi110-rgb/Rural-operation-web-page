"use client"

import { RefreshCw, UserPlus, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface VillagerRow extends Record<string, unknown> {
  id: string
  name: string
  phone: string
  skills: string[]
  nodeId?: string
  status: "active" | "inactive"
  node?: { slug: string; nameKey: string } | null
  taskSummary?: {
    totalTasks: number
    completedTasks: number
    totalEarnings: number
  }
  monthlyTaskSummary?: {
    totalTasks: number
    completedTasks: number
    totalEarnings: number
  }
  createdAt: string
}

interface NodeRow {
  id: string
  slug: string
  nameKey: string
}

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"
const skillOptions = ["cooking", "farming", "guiding", "handicraft", "logistics"] as const

export default function VillagersPage() {
  const [villagers, setVillagers] = useState<VillagerRow[]>([])
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [selected, setSelected] = useState<VillagerRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    phone: "",
    skills: ["farming"] as string[],
    nodeId: "",
    status: "active",
  })

  async function loadData() {
    setIsLoading(true)
    setError("")

    try {
      const [villagerResponse, nodeResponse] = await Promise.all([
        fetch(`${adminApiBase}/villagers`),
        fetch(`${adminApiBase}/nodes`),
      ])

      if (!villagerResponse.ok || !nodeResponse.ok) {
        throw new Error(adminCopy.common.error)
      }

      const villagerPayload = (await villagerResponse.json()) as { data?: VillagerRow[] }
      const nodePayload = (await nodeResponse.json()) as { data?: NodeRow[] }
      setVillagers(villagerPayload.data ?? [])
      setNodes(nodePayload.data ?? [])
    } catch (caughtError) {
      console.warn("Villager data load failed", caughtError)
      setVillagers([])
      setNodes([])
      setError(adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function selectVillager(row: VillagerRow) {
    setSelected(row)
    setForm({
      name: row.name,
      phone: row.phone,
      skills: row.skills,
      nodeId: row.nodeId ?? "",
      status: row.status,
    })
  }

  function resetForm() {
    setSelected(null)
    setForm({ name: "", phone: "", skills: ["farming"], nodeId: "", status: "active" })
  }

  function toggleSkill(skill: string) {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((item) => item !== skill)
        : [...current.skills, skill],
    }))
  }

  async function saveVillager() {
    setMessage("")
    try {
      const response = await fetch(`${adminApiBase}/villagers`, {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
        body: JSON.stringify({
          ...(selected ? { id: selected.id } : {}),
          ...form,
          nodeId: form.nodeId || null,
        }),
      })
      setMessage(response.ok ? adminCopy.villagers.saved : adminCopy.villagers.saveFailed)
      if (response.ok) {
        await loadData()
        resetForm()
      }
    } catch {
      setMessage(adminCopy.villagers.saveFailed)
    }
  }

  const columns = useMemo<Array<TableColumn<VillagerRow>>>(
    () => [
      { key: "name", label: adminCopy.villagers.name },
      { key: "phone", label: adminCopy.villagers.phone, render: (value) => maskPhone(String(value ?? "")) },
      { key: "skills", label: adminCopy.villagers.skills, render: (value) => renderSkills(Array.isArray(value) ? value : []) },
      { key: "node", label: adminCopy.villagers.node, render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
      { key: "status", label: adminCopy.villagers.status, render: (value) => value === "active" ? adminCopy.villagers.active : adminCopy.villagers.inactive },
    ],
    [],
  )

  const activeCount = villagers.filter((villager) => villager.status === "active").length
  const selectedSummary = selected?.taskSummary ?? { totalTasks: 0, completedTasks: 0, totalEarnings: 0 }
  const selectedMonthlySummary = selected?.monthlyTaskSummary ?? { totalTasks: 0, completedTasks: 0, totalEarnings: 0 }
  const earningsRanking = [...villagers]
    .sort((a, b) => (b.taskSummary?.totalEarnings ?? 0) - (a.taskSummary?.totalEarnings ?? 0))
    .slice(0, 5)

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.villagers.subtitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.villagers.title}</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold" onClick={resetForm} type="button">
            <UserPlus className="h-4 w-4" />
            {adminCopy.villagers.create}
          </button>
          <button className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold" onClick={loadData} type="button">
            <RefreshCw className="h-4 w-4" />
            {adminCopy.common.refresh}
          </button>
        </div>
      </header>

      {error ? <div className="rounded-md bg-lychee/10 p-3 text-sm font-bold text-lychee">{error}</div> : null}
      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard icon={<Users className="h-4 w-4" />} label={adminCopy.villagers.title} value={isLoading ? "..." : villagers.length} />
        <AdminStatCard label={adminCopy.villagers.active} value={activeCount} />
        <AdminStatCard label={adminCopy.villagers.inactive} value={villagers.length - activeCount} />
      </div>

      <section className="rounded-lg border border-stone bg-white p-4 shadow-soft">
        <div className="text-sm font-extrabold">{adminCopy.villagers.earningsRanking}</div>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {earningsRanking.map((villager, index) => (
            <button
              className="rounded-md bg-rice p-3 text-left"
              key={villager.id}
              onClick={() => selectVillager(villager)}
              type="button"
            >
              <div className="text-xs font-bold text-water">TOP {index + 1}</div>
              <div className="mt-1 truncate text-sm font-extrabold">{villager.name}</div>
              <div className="mt-1 text-xs font-semibold text-ink/58">¥{(villager.taskSummary?.totalEarnings ?? 0).toFixed(0)}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <AdminDataTable
          columns={columns}
          emptyLabel={adminCopy.villagers.noData}
          isLoading={isLoading}
          onRowClick={selectVillager}
          rows={villagers}
          selectedId={selected?.id}
        />

        <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="text-lg font-extrabold">{selected ? adminCopy.villagers.detail : adminCopy.villagers.create}</div>
          <div className="mt-4 grid gap-3">
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={adminCopy.villagers.name} value={form.name} />
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder={adminCopy.villagers.phone} value={form.phone} />
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, nodeId: event.target.value })} value={form.nodeId}>
              <option value="">{adminCopy.villagers.node}</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{nodeDisplayName(node.slug, node.nameKey)}</option>)}
            </select>
            <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>
              <option value="active">{adminCopy.villagers.active}</option>
              <option value="inactive">{adminCopy.villagers.inactive}</option>
            </select>

            <div>
              <div className="mb-2 text-xs font-bold text-ink/52">{adminCopy.villagers.skills}</div>
              <div className="grid grid-cols-2 gap-2">
                {skillOptions.map((skill) => (
                  <label className="flex items-center gap-2 rounded-md border border-stone bg-rice px-3 py-2 text-xs font-bold" key={skill}>
                    <input checked={form.skills.includes(skill)} onChange={() => toggleSkill(skill)} type="checkbox" />
                    {adminCopy.villagers.skillOptions[skill]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white" onClick={saveVillager} type="button">
            {adminCopy.villagers.save}
          </button>

          <div className="mt-5 rounded-md bg-rice p-4">
            <div className="text-sm font-extrabold">{adminCopy.villagers.earnings}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <AdminStatCard label={adminCopy.villagers.completedTasks} value={selectedSummary.completedTasks} />
              <AdminStatCard label={adminCopy.villagers.totalEarnings} value={`¥${selectedSummary.totalEarnings.toFixed(0)}`} />
              <AdminStatCard label={adminCopy.villagers.monthlyTasks} value={selectedMonthlySummary.completedTasks} />
              <AdminStatCard label={adminCopy.villagers.monthlyEarnings} value={`¥${selectedMonthlySummary.totalEarnings.toFixed(0)}`} />
            </div>
            <p className="mt-3 text-xs font-semibold text-ink/52">
              {selected ? `${selectedSummary.totalTasks} 个任务记录` : adminCopy.villagers.noSelection}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function maskPhone(phone: string) {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function renderSkills(skills: string[]) {
  return skills
    .map((skill) => adminCopy.villagers.skillOptions[skill as keyof typeof adminCopy.villagers.skillOptions] ?? skill)
    .join(" / ")
}
