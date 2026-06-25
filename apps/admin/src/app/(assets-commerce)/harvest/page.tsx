"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { adminApiBase, fetchAdminApi } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface ShipmentRow {
  id: string
  harvestBookingId: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  courier?: string
  trackingNumber?: string
  status: "pending" | "picking" | "shipping" | "delivered"
}

interface HarvestRow extends Record<string, unknown> {
  id: string
  treeId: string
  scheduledDate: string
  timeSlot: string
  guestCount: number
  guestName?: string
  guestPhone?: string
  fruitDestination?: string
  destinationNote?: string
  status: string
  createdAt: string
  shipment?: ShipmentRow
}

const shipmentStatuses: ShipmentRow["status"][] = ["pending", "picking", "shipping", "delivered"]

function getNextShipmentStatus(status?: ShipmentRow["status"]) {
  if (!status) return "pending"
  const index = shipmentStatuses.indexOf(status)
  return shipmentStatuses[Math.min(index + 1, shipmentStatuses.length - 1)]
}

export default function HarvestPage() {
  const [rows, setRows] = useState<HarvestRow[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [shipmentDraft, setShipmentDraft] = useState({
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    courier: "",
    trackingNumber: "",
    status: "pending" as ShipmentRow["status"],
  })

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? rows[0], [rows, selectedId])

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    const payload = await fetchAdminApi<{ data?: HarvestRow[] }>("/harvest-bookings")
    const nextRows = payload.data ?? []
    setRows(nextRows)
    setSelectedId((current) => (current && nextRows.some((row) => row.id === current) ? current : (nextRows[0]?.id ?? "")))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    if (!selectedRow) return
    setShipmentDraft({
      recipientName: selectedRow.shipment?.recipientName ?? selectedRow.guestName ?? "",
      recipientPhone: selectedRow.shipment?.recipientPhone ?? selectedRow.guestPhone ?? "",
      recipientAddress: selectedRow.shipment?.recipientAddress ?? "",
      courier: selectedRow.shipment?.courier ?? "",
      trackingNumber: selectedRow.shipment?.trackingNumber ?? "",
      status: selectedRow.shipment ? getNextShipmentStatus(selectedRow.shipment.status) : "pending",
    })
  }, [selectedRow])

  async function updateStatus(id: string, status: string) {
    try {
      await fetchAdminApi("/harvest-bookings", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      })
      setMessage("采摘状态已更新。")
      await loadRows()
    } catch {
      setMessage("采摘状态更新失败。")
    }
  }

  async function updateDestination(row: HarvestRow, fruitDestination: string) {
    try {
      await fetchAdminApi("/harvest-bookings", {
        method: "PATCH",
        body: JSON.stringify({
          id: row.id,
          status: row.status,
          fruitDestination,
          destinationNote: row.destinationNote ?? "",
        }),
      })
      setMessage("果实去向已更新。")
      await loadRows()
    } catch {
      setMessage("果实去向更新失败。")
    }
  }

  async function saveShipment() {
    if (!selectedRow) return

    const payload = {
      harvestBookingId: selectedRow.id,
      recipientName: shipmentDraft.recipientName,
      recipientPhone: shipmentDraft.recipientPhone,
      recipientAddress: shipmentDraft.recipientAddress,
      courier: shipmentDraft.courier,
      trackingNumber: shipmentDraft.trackingNumber,
      status: shipmentDraft.status,
    }

    try {
      await fetchAdminApi("/harvest-shipments", {
        method: selectedRow.shipment ? "PATCH" : "POST",
        body: JSON.stringify(selectedRow.shipment ? { id: selectedRow.shipment.id, ...payload } : payload),
      })

      setMessage("物流信息已保存。")
      await loadRows()
    } catch (error) {
      setMessage(`物流保存失败：${error instanceof Error ? error.message : "请检查状态流转"}`)
    }
  }

  const columns: Array<TableColumn<HarvestRow>> = [
    { key: "treeId", label: "树木" },
    { key: "scheduledDate", label: adminCopy.harvest.date },
    { key: "timeSlot", label: adminCopy.harvest.timeSlot },
    { key: "guestCount", label: adminCopy.harvest.guestCount },
    { key: "fruitDestination", label: "果实去向", render: (value) => String(value ?? "未设置") },
    { key: "status", label: adminCopy.harvest.status },
    {
      key: "shipment",
      label: "物流",
      render: (_value, row) => row.shipment?.status ?? "未创建",
    },
    {
      key: "id",
      label: "操作",
      render: (_value, row) => (
        <span className="flex flex-wrap gap-2">
          <button className="text-moss" onClick={() => updateStatus(row.id, "confirmed")} type="button">
            确认
          </button>
          <button className="text-water" onClick={() => updateStatus(row.id, "completed")} type="button">
            完成
          </button>
          <button className="text-lychee" onClick={() => updateDestination(row, "加工")} type="button">
            加工
          </button>
          <button className="text-ink/70" onClick={() => updateDestination(row, "销售")} type="button">
            销售
          </button>
          <button className="font-bold text-water" onClick={() => setSelectedId(row.id)} type="button">
            物流
          </button>
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminDataTable columns={columns} emptyLabel={adminCopy.harvest.noData} isLoading={isLoading} rows={rows} />
        <aside className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-water">代摘代寄</p>
          <h2 className="mt-1 text-lg font-extrabold">{selectedRow ? `${selectedRow.treeId} / ${selectedRow.scheduledDate}` : "请选择采摘单"}</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              收件人
              <input className="h-10 rounded-md border border-stone px-3" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, recipientName: event.target.value }))} value={shipmentDraft.recipientName} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              手机号
              <input className="h-10 rounded-md border border-stone px-3" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, recipientPhone: event.target.value }))} value={shipmentDraft.recipientPhone} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              收货地址
              <textarea className="min-h-20 rounded-md border border-stone px-3 py-2" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, recipientAddress: event.target.value }))} value={shipmentDraft.recipientAddress} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              快递公司
              <input className="h-10 rounded-md border border-stone px-3" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, courier: event.target.value }))} value={shipmentDraft.courier} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              快递单号
              <input className="h-10 rounded-md border border-stone px-3" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, trackingNumber: event.target.value }))} value={shipmentDraft.trackingNumber} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              下一状态
              <select className="h-10 rounded-md border border-stone px-3" onChange={(event) => setShipmentDraft((draft) => ({ ...draft, status: event.target.value as ShipmentRow["status"] }))} value={shipmentDraft.status}>
                {shipmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button className="mt-2 h-11 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-50" disabled={!selectedRow} onClick={saveShipment} type="button">
              保存物流
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
