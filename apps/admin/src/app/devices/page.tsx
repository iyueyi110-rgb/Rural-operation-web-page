"use client"

import { AlertTriangle, Plus, RadioTower, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface DeviceRow {
  id: string
  deviceId: string
  name: string
  type: string
  status: string
  nodeId?: string | null
  location?: string | null
  lastSeenAt?: string | null
  node?: { slug: string; nameKey: string } | null
  readings: Array<{ id: string; type: string; value: number; unit: string; createdAt: string }>
}

interface NodeRow {
  id: string
  slug: string
  nameKey: string
}

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    deviceId: "water-level-01",
    name: "水位监测 01",
    type: "water_level",
    status: "active",
    nodeId: "",
    location: "涂家湾近水点",
  })

  async function loadData() {
    setIsLoading(true)
    const [deviceResponse, nodeResponse] = await Promise.all([
      fetch(`${adminApiBase}/devices`),
      fetch(`${adminApiBase}/nodes`),
    ])
    const devicePayload = (await deviceResponse.json()) as { data?: DeviceRow[] }
    const nodePayload = (await nodeResponse.json()) as { data?: NodeRow[] }
    setDevices(devicePayload.data ?? [])
    setNodes(nodePayload.data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function saveDevice() {
    setMessage("")
    const response = await fetch(`${adminApiBase}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({ ...form, nodeId: form.nodeId || null }),
    })
    setMessage(response.ok ? adminCopy.devices.saved : adminCopy.devices.saveFailed)
    if (response.ok) await loadData()
  }

  const summary = useMemo(() => {
    const now = Date.now()
    const online = devices.filter((device) => isOnline(device.lastSeenAt, now)).length
    return {
      total: devices.length,
      online,
      offline: devices.filter((device) => device.lastSeenAt && !isOnline(device.lastSeenAt, now)).length,
      unknown: devices.filter((device) => !device.lastSeenAt).length,
    }
  }, [devices])

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">{adminCopy.devices.subtitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.devices.title}</h1>
        </div>
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold"
          onClick={loadData}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {adminCopy.common.refresh}
        </button>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard icon={<RadioTower className="h-4 w-4" />} label={adminCopy.devices.title} value={isLoading ? "..." : summary.total} />
        <AdminStatCard label={adminCopy.devices.online} value={isLoading ? "..." : summary.online} />
        <AdminStatCard label={adminCopy.devices.offline} value={isLoading ? "..." : summary.offline} />
        <AdminStatCard label={adminCopy.devices.unknown} value={isLoading ? "..." : summary.unknown} />
      </div>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <Plus className="h-5 w-5 text-water" />
          {adminCopy.devices.create}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, deviceId: event.target.value })} placeholder={adminCopy.devices.deviceId} value={form.deviceId} />
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={adminCopy.devices.name} value={form.name} />
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder={adminCopy.devices.type} value={form.type} />
          <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>
            <option value="active">active</option>
            <option value="maintenance">maintenance</option>
            <option value="disabled">disabled</option>
          </select>
          <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, nodeId: event.target.value })} value={form.nodeId}>
            <option value="">{adminCopy.devices.node}</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>{nodeDisplayName(node.slug, node.nameKey)}</option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={adminCopy.devices.location} value={form.location} />
        </div>
        <button className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white" onClick={saveDevice} type="button">
          {adminCopy.devices.save}
        </button>
      </section>

      <section className="grid gap-3">
        {devices.length ? (
          devices.map((device) => <DeviceCard device={device} key={device.id} />)
        ) : (
          <div className="rounded-lg border border-stone bg-white p-5 text-sm font-semibold text-ink/54 shadow-soft">
            {adminCopy.devices.noData}
          </div>
        )}
      </section>
    </div>
  )
}

function DeviceCard({ device }: { device: DeviceRow }) {
  const latest = device.readings[0]
  const online = isOnline(device.lastSeenAt, Date.now())
  const width = latest ? `${Math.min(Math.abs(latest.value) * 4, 100)}%` : "0%"

  return (
    <article className="rounded-lg border border-stone bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-moss" : "bg-lychee"}`} />
            <h2 className="text-lg font-extrabold">{device.name}</h2>
          </div>
          <p className="mt-1 text-xs font-bold text-ink/52">{device.deviceId} / {device.type}</p>
          <p className="mt-2 text-sm font-semibold text-ink/62">
            {device.node ? nodeDisplayName(device.node.slug, device.node.nameKey) : adminCopy.devices.node}
            {device.location ? ` · ${device.location}` : ""}
          </p>
        </div>
        <div className="rounded-md bg-rice px-3 py-2 text-xs font-bold text-ink/60">
          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("zh-CN") : adminCopy.devices.unknown}
        </div>
      </div>

      {latest ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{adminCopy.devices.latestReading}</span>
            <span>{latest.value} {latest.unit}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-rice">
            <div className="h-full rounded-full bg-water" style={{ width }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-ink/50">{latest.type} / {new Date(latest.createdAt).toLocaleString("zh-CN")}</p>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-rice p-3 text-sm font-semibold text-ink/56">
          <AlertTriangle className="h-4 w-4 text-lychee" />
          {adminCopy.devices.unknown}
        </div>
      )}
    </article>
  )
}

function isOnline(value: string | null | undefined, now: number) {
  if (!value) return false
  return now - new Date(value).getTime() <= 30 * 60 * 1000
}
