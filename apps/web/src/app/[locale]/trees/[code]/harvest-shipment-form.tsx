"use client"

import { useState } from "react"
import { PackageCheck } from "lucide-react"
import { useTranslations } from "next-intl"

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
    <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-bold text-lychee">
        <PackageCheck aria-hidden="true" className="h-4 w-4" />
        {t("title")}
      </div>
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
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              {t("dateLabel")}
              <select className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setScheduledDate(event.target.value)} value={scheduledDate}>
                {dateOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              {t("timeSlotLabel")}
              <select className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setTimeSlot(event.target.value)} value={timeSlot}>
                {timeSlotOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              {t("guestCountLabel")}
              <input
                className="h-11 rounded-md border border-stone bg-rice px-3"
                min={1}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                type="number"
                value={guestCount}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              {t("recipientNameLabel")}
              <input className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setRecipientName(event.target.value)} value={recipientName} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              {t("recipientPhoneLabel")}
              <input className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setRecipientPhone(event.target.value)} value={recipientPhone} />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-ink/70">
            {t("recipientAddressLabel")}
            <textarea
              className="min-h-24 rounded-md border border-stone bg-rice px-3 py-2"
              onChange={(event) => setRecipientAddress(event.target.value)}
              value={recipientAddress}
            />
          </label>

          {error ? <p className="text-sm font-bold text-lychee">{error}</p> : null}
          {message ? <p className="rounded-md bg-moss/10 p-3 text-sm font-bold text-moss">{message}</p> : null}
          <button
            className="inline-flex h-11 w-fit items-center rounded-full bg-ink px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </div>
      ) : null}
    </section>
  )
}
