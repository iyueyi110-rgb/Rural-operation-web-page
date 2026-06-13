"use client"

import Image from "next/image"
import { BedDouble, CalendarDays, CheckCircle2, CircleAlert, CreditCard, UsersRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import {
  bookingDateOptions,
  courtyardOptions,
  guestOptions,
  paymentModeOptions,
  type PaymentMode,
  type CourtyardOption,
} from "@web/lib/courtyards-data"
import { MasterDetailLayout } from "@ui/index"

type InventoryStatus = CourtyardOption["inventoryStatus"] | (typeof bookingDateOptions)[number]["status"]

interface BookingOrder {
  id: string
  status: "pending_payment"
  createdAt: string
}

const statusTone: Record<InventoryStatus, string> = {
  available: "bg-moss/12 text-moss border-moss/20",
  limited: "bg-lychee/10 text-lychee border-lychee/20",
  booked: "bg-ink/8 text-ink/56 border-ink/10",
  maintenance: "bg-water/10 text-water border-water/20",
}

function resolveInventoryStatus(courtyard: CourtyardOption, dateStatus: InventoryStatus): InventoryStatus {
  if (courtyard.inventoryStatus === "maintenance") {
    return "maintenance"
  }

  if (dateStatus === "booked" || courtyard.inventoryStatus === "booked") {
    return "booked"
  }

  if (dateStatus === "limited" || courtyard.inventoryStatus === "limited") {
    return "limited"
  }

  return "available"
}

export function BookingFlow() {
  const t = useTranslations("booking")
  const [selectedCourtyardId, setSelectedCourtyardId] = useState(courtyardOptions[0].id)
  const [selectedDate, setSelectedDate] = useState<string>(bookingDateOptions[0].value)
  const [guestCount, setGuestCount] = useState(4)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("deposit")
  const [order, setOrder] = useState<BookingOrder | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCourtyard = useMemo(
    () => courtyardOptions.find((courtyard) => courtyard.id === selectedCourtyardId) ?? courtyardOptions[0],
    [selectedCourtyardId],
  )
  const selectedDateOption =
    bookingDateOptions.find((dateOption) => dateOption.value === selectedDate) ?? bookingDateOptions[0]
  const selectedStatus = resolveInventoryStatus(selectedCourtyard, selectedDateOption.status)
  const capacityExceeded = guestCount > selectedCourtyard.capacity
  const canConfirm =
    !capacityExceeded && (selectedStatus === "available" || selectedStatus === "limited")

  function handleCourtyardSelect(courtyardId: string) {
    setSelectedCourtyardId(courtyardId)
    setOrder(null)
    setSubmitError(false)
  }

  async function handleConfirm() {
    if (!canConfirm || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(false)

    try {
      const response = await fetch("/api/v1/courtyard-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtyardId: selectedCourtyard.id,
          date: selectedDate,
          guestCount,
          paymentMode,
        }),
      })

      if (!response.ok) {
        throw new Error("courtyard booking request failed")
      }

      const result = (await response.json()) as { data: BookingOrder }
      setOrder(result.data)
    } catch (caughtError) {
      console.error("Courtyard booking failed:", caughtError)
      setOrder(null)
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MasterDetailLayout
      master={
        <>
        <div className="flex items-center gap-2 text-sm font-bold text-water">
          <BedDouble aria-hidden="true" className="h-4 w-4" />
          {t("list.eyebrow")}
        </div>
        <h2 className="mt-3 break-all text-3xl font-extrabold">{t("list.title")}</h2>
        <p className="mt-3 break-all text-sm leading-7 text-ink/68">{t("list.body")}</p>

        <div className="mt-6 grid gap-4">
          {courtyardOptions.map((courtyard) => {
            const active = courtyard.id === selectedCourtyard.id
            const status = resolveInventoryStatus(courtyard, selectedDateOption.status)

            return (
              <article
                className={
                  active
                    ? "grid overflow-hidden rounded-lg border-2 border-ink bg-white shadow-soft md:grid-cols-[220px_1fr]"
                    : "grid overflow-hidden rounded-lg border border-stone bg-white shadow-soft md:grid-cols-[220px_1fr]"
                }
                key={courtyard.id}
              >
                <div className="relative aspect-[4/3] md:aspect-auto">
                  <Image
                    alt={t(courtyard.imageAltKey)}
                    className="object-cover"
                    fill
                    sizes="(min-width: 768px) 220px, 100vw"
                    src={courtyard.imageAsset}
                  />
                </div>
                <div className="min-w-0 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-all text-xl font-extrabold">{t(courtyard.nameKey)}</h3>
                      <p className="mt-1 text-sm text-ink/58">{t(courtyard.locationKey)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[status]}`}>
                      {t(`inventory.${status}`)}
                    </span>
                  </div>

                  <p className="mt-3 break-all text-sm leading-6 text-ink/68">{t(courtyard.summaryKey)}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {courtyard.amenities.map((amenity) => (
                      <span className="rounded-full bg-rice px-3 py-1 text-xs font-semibold text-ink/66" key={amenity}>
                        {t(amenity)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-rice p-3">
                      <div className="text-lg font-extrabold">{courtyard.capacity}</div>
                      <div className="text-xs text-ink/58">{t("list.capacity")}</div>
                    </div>
                    <div className="rounded-md bg-rice p-3">
                      <div className="text-lg font-extrabold">{t(courtyard.priceLabel)}</div>
                      <div className="text-xs text-ink/58">{t("list.price")}</div>
                    </div>
                    <div className="rounded-md bg-rice p-3">
                      <div className="text-lg font-extrabold">{courtyard.minNights}</div>
                      <div className="text-xs text-ink/58">{t("list.minNights")}</div>
                    </div>
                  </div>

                  <button
                    className={
                      active
                        ? "mt-5 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white"
                        : "mt-5 h-10 rounded-full border border-stone px-5 text-sm font-bold text-ink transition hover:border-ink"
                    }
                    onClick={() => handleCourtyardSelect(courtyard.id)}
                    type="button"
                  >
                    {active ? t("list.selected") : t("list.select")}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        </>
      }
      detail={
        <>
        <div className="flex items-center gap-2 text-sm font-bold text-lychee">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {t("form.eyebrow")}
        </div>
        <h2 className="mt-3 break-all text-2xl font-extrabold">{t("form.title")}</h2>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            {t("form.dateLabel")}
            <select
              className="h-12 w-full rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
              onChange={(event) => {
                setSelectedDate(event.target.value)
                setOrder(null)
                setSubmitError(false)
              }}
              value={selectedDate}
            >
              {bookingDateOptions.map((dateOption) => (
                <option key={dateOption.value} value={dateOption.value}>
                  {t(dateOption.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            {t("form.guestsLabel")}
            <select
              className="h-12 w-full rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
              onChange={(event) => {
                setGuestCount(Number(event.target.value))
                setOrder(null)
                setSubmitError(false)
              }}
              value={guestCount}
            >
              {guestOptions.map((option) => (
                <option key={option} value={option}>
                  {t("form.guestsValue", { count: option })}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="text-sm font-semibold">{t("form.paymentModeLabel")}</div>
            <div className="mt-2 grid grid-cols-2 rounded-full border border-stone bg-rice p-1">
              {paymentModeOptions.map((option) => (
                <button
                  aria-pressed={paymentMode === option.value}
                  className={
                    paymentMode === option.value
                      ? "h-10 rounded-full bg-ink px-3 text-sm font-bold text-white"
                      : "h-10 rounded-full px-3 text-sm font-bold text-ink/64"
                  }
                  key={option.value}
                  onClick={() => {
                    setPaymentMode(option.value)
                    setOrder(null)
                    setSubmitError(false)
                  }}
                  type="button"
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-md bg-rice p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold">{t("summary.title")}</div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[selectedStatus]}`}>
              {t(`inventory.${selectedStatus}`)}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/58">{t("summary.courtyard")}</dt>
              <dd className="text-right font-semibold">{t(selectedCourtyard.nameKey)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/58">{t("summary.date")}</dt>
              <dd className="text-right font-semibold">{t(selectedDateOption.labelKey)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/58">{t("summary.guests")}</dt>
              <dd className="text-right font-semibold">{t("form.guestsValue", { count: guestCount })}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/58">{t("summary.paymentMode")}</dt>
              <dd className="text-right font-semibold">
                {t(paymentModeOptions.find((option) => option.value === paymentMode)?.labelKey ?? "paymentModes.deposit")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 rounded-md border border-stone p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CircleAlert aria-hidden="true" className="h-4 w-4 text-water" />
            {t("notice.title")}
          </div>
          <p className="mt-2 break-all text-sm leading-6 text-ink/66">{t(selectedCourtyard.bookingNotice)}</p>
        </div>

        {capacityExceeded ? (
          <p className="mt-4 rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">
            {t("messages.capacityExceeded")}
          </p>
        ) : null}
        {submitError ? (
          <p className="mt-4 rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">
            {t("messages.submitFailed")}
          </p>
        ) : null}

        <button
          className={
            canConfirm && !isSubmitting
              ? "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss"
              : "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink/20 px-5 text-sm font-bold text-ink/46"
          }
          disabled={!canConfirm || isSubmitting}
          onClick={handleConfirm}
          type="button"
        >
          <UsersRound aria-hidden="true" className="h-4 w-4" />
          {isSubmitting ? t("form.confirming") : t("form.confirm")}
        </button>

        {order ? (
          <div className="mt-5 rounded-lg border border-moss/20 bg-moss/10 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-moss">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              {t("order.title")}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/70">{t("order.body")}</p>
            <div className="mt-4 rounded-md bg-white p-3 text-sm">
              <div className="font-bold">{t("order.status")}</div>
              <div className="mt-1 text-ink/62">{t("order.paymentStatus")}</div>
              <div className="mt-2 font-semibold">{t("order.idLabel")}: {order.id}</div>
              <div className="mt-1 text-ink/62">{t("order.createdAtLabel")}: {new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <button
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold text-ink/70"
              disabled
              type="button"
            >
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              {t("order.paymentEntry")}
            </button>
          </div>
        ) : null}
        </>
      }
    />
  )
}
