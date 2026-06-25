"use client"

import { PackageCheck, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { EmptyState, FieldLabel, InlineNotice, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

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

const shipmentSteps: Array<{ key: ShipmentRecord["status"] }> = [
  { key: "pending" },
  { key: "picking" },
  { key: "shipping" },
  { key: "delivered" },
]

export function AdoptionLookup() {
  const t = useTranslations("me.lookup")
  const [phone, setPhone] = useState("")
  const [records, setRecords] = useState<AdoptionRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(t("initialMessage"))

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
      setMessage(nextRecords.length > 0 ? t("found") : t("empty"))
    } catch (caughtError) {
      console.error("Adoption lookup failed:", caughtError)
      setRecords([])
      setMessage(t("failed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SurfacePanel className="mt-8">
      <PanelTitle icon={<Search aria-hidden="true" className="h-4 w-4" />} tone="lychee">
        {t("title")}
      </PanelTitle>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <FieldLabel label={t("phonePlaceholder")}>
          <input
            className="input-control"
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            value={phone}
          />
        </FieldLabel>
        <button
          className="btn-primary self-end"
          disabled={isLoading || !phone.trim()}
          onClick={handleLookup}
          type="button"
        >
          {isLoading ? t("loading") : t("submit")}
        </button>
      </div>
      <InlineNotice className="mt-3" tone="neutral">{message}</InlineNotice>
      <div className="mt-4 grid gap-3">
        {records.map((record) => (
          <article className="rounded-lg bg-rice p-4 text-sm" key={record.id}>
            <div className="font-extrabold">{record.id}</div>
            <div className="mt-1 text-ink/62">{t("tree")}: {record.treeCode ?? record.treeId}</div>
            <div className="mt-1 text-ink/62">{t("plan")}: {record.plan}</div>
            <div className="mt-1 text-ink/62">{t("status")}: {record.status}</div>
            <div className="mt-1 text-ink/46">{new Date(record.createdAt).toLocaleString()}</div>
            <ShipmentTimeline bookings={record.harvestBookings ?? []} />
          </article>
        ))}
      </div>
    </SurfacePanel>
  )
}

function ShipmentTimeline({ bookings }: { bookings: HarvestBookingRecord[] }) {
  const t = useTranslations("me.lookup")
  const shipmentBooking = bookings.find((booking) => booking.shipment)
  const shipment = shipmentBooking?.shipment

  if (!shipment) {
    return (
      <EmptyState className="mt-4 min-h-24" title={t("noShipment")} />
    )
  }

  const currentIndex = shipmentSteps.findIndex((step) => step.key === shipment.status)

  return (
    <div className="mt-4 rounded-md border border-stone bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-extrabold text-water">
        <PackageCheck aria-hidden="true" className="h-4 w-4" />
        {t("shipmentTitle")}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {shipmentSteps.map((step, index) => {
          const isActive = index <= currentIndex
          return (
            <div
              className={isActive ? "rounded-md bg-moss/10 p-2 text-moss" : "rounded-md bg-rice p-2 text-ink/42"}
              key={step.key}
            >
              <div className="text-xs font-extrabold">{t(`steps.${step.key}`)}</div>
              {step.key === "shipping" && shipment.status === "shipping" ? (
                <div className="mt-1 text-[11px] font-semibold">
                  {shipment.courier ?? t("steps.shipping")} {shipment.trackingNumber ?? ""}
                </div>
              ) : null}
              {step.key === "delivered" && shipment.status === "delivered" ? (
                <div className="mt-1 text-[11px] font-semibold">{t("signed")}</div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink/52">
        {t("harvestBooking", { date: shipmentBooking.scheduledDate, status: shipmentBooking.status })}
      </p>
    </div>
  )
}
