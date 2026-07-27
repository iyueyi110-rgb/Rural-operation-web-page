"use client"

import { useState } from "react"
import { PackageCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { FieldLabel, InlineNotice, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

const dateOptions = ["2026-06-21", "2026-06-28", "2026-07-05"]
const timeSlotOptions = ["09:00-11:00", "14:00-16:00"]

export function HarvestShipmentForm({ treeCode }: { treeCode: string }) {
  const t = useTranslations("trees.shipment")
  const [enabled, setEnabled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState(dateOptions[0])
  const [timeSlot, setTimeSlot] = useState(timeSlotOptions[0])
  const [guestCount, setGuestCount] = useState(1)
  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit() {
    setIsSubmitting(true)
    setError("")
    setMessage("")

    try {
      const bookingResponse = await fetch("/api/v1/harvest-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treeId: treeCode,
          scheduledDate,
          timeSlot,
          guestCount,
          guestName: recipientName,
          guestPhone: recipientPhone,
          fruitDestination: t("destination"),
          destinationNote: t("destinationNote"),
        }),
      })

      if (!bookingResponse.ok) throw new Error("booking_failed")
      const bookingPayload = (await bookingResponse.json()) as { data?: { id?: string } }
      const harvestBookingId = bookingPayload.data?.id
      if (!harvestBookingId) throw new Error("booking_missing_id")

      const shipmentResponse = await fetch("/api/v1/harvest-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harvestBookingId,
          recipientName,
          recipientPhone,
          recipientAddress,
        }),
      })

      if (!shipmentResponse.ok) throw new Error("shipment_failed")
      setMessage(t("success"))
    } catch (caughtError) {
      console.error("Harvest shipment submit failed:", caughtError)
      setError(t("failed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = recipientName.trim() && recipientPhone.trim() && recipientAddress.trim() && !isSubmitting

  return (
    <SurfacePanel>
      <PanelTitle icon={<PackageCheck aria-hidden="true" className="h-4 w-4" />} tone="lychee">{t("title")}</PanelTitle>
      <p className="mt-3 text-sm leading-7 text-ink/68">{t("body")}</p>

      <label className="mt-5 flex items-center gap-3 text-sm font-bold text-ink/78">
        <input
          checked={enabled}
          className="h-4 w-4 accent-lychee"
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
        {t("enableLabel")}
      </label>

      {enabled ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldLabel label={t("dateLabel")}>
              <select className="select-control" onChange={(event) => setScheduledDate(event.target.value)} value={scheduledDate}>
                {dateOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label={t("timeSlotLabel")}>
              <select className="select-control" onChange={(event) => setTimeSlot(event.target.value)} value={timeSlot}>
                {timeSlotOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label={t("guestCountLabel")}>
              <input
                className="input-control"
                min={1}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                type="number"
                value={guestCount}
              />
            </FieldLabel>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label={t("recipientNameLabel")}>
              <input className="input-control" onChange={(event) => setRecipientName(event.target.value)} value={recipientName} />
            </FieldLabel>
            <FieldLabel label={t("recipientPhoneLabel")}>
              <input className="input-control" onChange={(event) => setRecipientPhone(event.target.value)} value={recipientPhone} />
            </FieldLabel>
          </div>

          <FieldLabel label={t("recipientAddressLabel")}>
            <textarea
              className="textarea-control min-h-24"
              onChange={(event) => setRecipientAddress(event.target.value)}
              value={recipientAddress}
            />
          </FieldLabel>

          {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
          {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
          <button
            className="btn-primary w-fit bg-ink hover:bg-moss"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </div>
      ) : null}
    </SurfacePanel>
  )
}
