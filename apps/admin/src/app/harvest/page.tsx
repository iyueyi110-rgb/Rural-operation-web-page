"use client"

import { useCallback, useEffect, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface HarvestRow extends Record<string, unknown> {
  id: string
  treeId: string
  scheduledDate: string
  timeSlot: string
  guestCount: number
  guestName?: string
  status: string
  createdAt: string
}

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"

export default function HarvestPage() {
  const [rows, setRows] = useState<HarvestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch(`${adminApiBase}/harvest-bookings`)
    const payload = (await response.json()) as { data: HarvestRow[] }
    setRows(payload.data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  async function updateStatus(id: string, status: string) {
    const response = await fetch(`${adminApiBase}/harvest-bookings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({ id, status }),
    })
    setMessage(response.ok ? "状态已更新。" : "状态更新失败。")
    if (response.ok) await loadRows()
  }

  const columns: Array<TableColumn<HarvestRow>> = [
    { key: "treeId", label: "树木" },
    { key: "scheduledDate", label: adminCopy.harvest.date },
    { key: "timeSlot", label: adminCopy.harvest.timeSlot },
    { key: "guestCount", label: adminCopy.harvest.guestCount },
    { key: "status", label: adminCopy.harvest.status },
    {
      key: "id",
      label: "操作",
      render: (_value, row) => (
        <span className="flex gap-2">
          <button className="text-moss" onClick={() => updateStatus(row.id, "confirmed")} type="button">确认</button>
          <button className="text-water" onClick={() => updateStatus(row.id, "completed")} type="button">完成</button>
        </span>
      ),
    },
  ]

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.harvest.title}</h1>
      </header>
      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}
      <AdminDataTable columns={columns} emptyLabel={adminCopy.harvest.noData} isLoading={isLoading} rows={rows} />
    </div>
  )
}
