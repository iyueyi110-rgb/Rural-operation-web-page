"use client"

import { PackageCheck, Search } from "lucide-react"
import { useState } from "react"

interface ShipmentRecord {
  status: "pending" | "picking" | "shipping" | "delivered"
  courier?: string
  trackingNumber?: string
}

interface HarvestBookingRecord {
  id: string
  scheduledDate: string
  status: string
  shipment?: ShipmentRecord
}

interface AdoptionRecord {
  id: string
  treeId: string
  treeCode?: string
  plan: string
  status: string
  createdAt: string
  harvestBookings?: HarvestBookingRecord[]
}

const shipmentSteps: Array<{ key: ShipmentRecord["status"]; label: string }> = [
  { key: "pending", label: "待采摘" },
  { key: "picking", label: "采摘中" },
  { key: "shipping", label: "运输中" },
  { key: "delivered", label: "已送达" },
]

export function AdoptionLookup() {
  const [phone, setPhone] = useState("")
  const [records, setRecords] = useState<AdoptionRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("输入认养时预留的手机号，系统会按脱敏号码查询。")

  async function handleLookup() {
    if (!phone.trim()) return
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch(`/api/v1/tree-adoptions?adopterPhone=${encodeURIComponent(phone.trim())}`)
      if (!response.ok) throw new Error("lookup failed")
      const payload = (await response.json()) as { data?: AdoptionRecord[] }
      const nextRecords = payload.data ?? []
      setRecords(nextRecords)
      setMessage(nextRecords.length > 0 ? "已找到认养记录。" : "暂无匹配认养记录。")
    } catch (caughtError) {
      console.error("Adoption lookup failed:", caughtError)
      setRecords([])
      setMessage("查询失败，请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-stone bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-lychee">
        <Search aria-hidden="true" className="h-4 w-4" />
        我的认养
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="h-11 rounded-md border border-stone bg-rice px-4 text-sm font-semibold outline-none focus:border-ink"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="请输入手机号"
          type="tel"
          value={phone}
        />
        <button
          className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:bg-ink/30"
          disabled={isLoading || !phone.trim()}
          onClick={handleLookup}
          type="button"
        >
          {isLoading ? "查询中" : "查询认养"}
        </button>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink/58">{message}</p>
      <div className="mt-4 grid gap-3">
        {records.map((record) => (
          <article className="rounded-md bg-rice p-4 text-sm" key={record.id}>
            <div className="font-extrabold">{record.id}</div>
            <div className="mt-1 text-ink/62">树木：{record.treeCode ?? record.treeId}</div>
            <div className="mt-1 text-ink/62">方案：{record.plan}</div>
            <div className="mt-1 text-ink/62">状态：{record.status}</div>
            <div className="mt-1 text-ink/46">{new Date(record.createdAt).toLocaleString()}</div>
            <ShipmentTimeline bookings={record.harvestBookings ?? []} />
          </article>
        ))}
      </div>
    </section>
  )
}

function ShipmentTimeline({ bookings }: { bookings: HarvestBookingRecord[] }) {
  const shipmentBooking = bookings.find((booking) => booking.shipment)
  const shipment = shipmentBooking?.shipment

  if (!shipment) {
    return (
      <div className="mt-4 rounded-md border border-stone bg-white p-3 text-sm font-semibold text-ink/58">
        暂无代摘物流。
      </div>
    )
  }

  const currentIndex = shipmentSteps.findIndex((step) => step.key === shipment.status)

  return (
    <div className="mt-4 rounded-md border border-stone bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-extrabold text-water">
        <PackageCheck aria-hidden="true" className="h-4 w-4" />
        代摘物流
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {shipmentSteps.map((step, index) => {
          const isActive = index <= currentIndex
          return (
            <div
              className={isActive ? "rounded-md bg-moss/10 p-2 text-moss" : "rounded-md bg-rice p-2 text-ink/42"}
              key={step.key}
            >
              <div className="text-xs font-extrabold">{step.label}</div>
              {step.key === "shipping" && shipment.status === "shipping" ? (
                <div className="mt-1 text-[11px] font-semibold">
                  {shipment.courier ?? "快递"} {shipment.trackingNumber ?? ""}
                </div>
              ) : null}
              {step.key === "delivered" && shipment.status === "delivered" ? (
                <div className="mt-1 text-[11px] font-semibold">已签收</div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink/52">
        采摘预约：{shipmentBooking.scheduledDate} / {shipmentBooking.status}
      </p>
    </div>
  )
}
