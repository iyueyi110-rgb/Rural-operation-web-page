"use client"

import Image from "next/image"
import { BedDouble, CalendarDays, CheckCircle2, CircleAlert, CreditCard, UsersRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import {
  bookingDateOptions,
  courtyardOptions,
  guestOptions,
  paymentModeOptions,
  type PaymentMode,
  type CourtyardOption,
} from "@web/lib/courtyards-data"
import { FieldLabel, InlineNotice, MetricTile, PanelTitle, SegmentedControl } from "@web/components/subpage-ui"
import { MasterDetailLayout } from "@ui/index"
import { fetchWithAuth, rememberTouristIdentity } from "@web/lib/auth-client"

type InventoryStatus = CourtyardOption["inventoryStatus"] | (typeof bookingDateOptions)[number]["status"]

interface BookingOrder {
  id: string
  status: "pending_payment"
  createdAt: string
}

interface CourtyardActivity {
  id: string
  activityType: string
  title: string
  scheduledDate: string
  scheduledTime: string
  status: string
  bookedCount: number
  maxCapacity: number
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
  const systemT = useTranslations("villagerSystem")
  const [selectedCourtyardId, setSelectedCourtyardId] = useState(courtyardOptions[0].id)
  const [selectedDate, setSelectedDate] = useState<string>(bookingDateOptions[0].value)
  const [guestCount, setGuestCount] = useState(4)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("deposit")
  const [phone, setPhone] = useState("")
  const [order, setOrder] = useState<BookingOrder | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activities, setActivities] = useState<CourtyardActivity[]>([])

  const selectedCourtyard = useMemo(
    () => courtyardOptions.find((courtyard) => courtyard.id === selectedCourtyardId) ?? courtyardOptions[0],
    [selectedCourtyardId],
  )
  const selectedDateOption =
    bookingDateOptions.find((dateOption) => dateOption.value === selectedDate) ?? bookingDateOptions[0]
  const selectedStatus = resolveInventoryStatus(selectedCourtyard, selectedDateOption.status)
  const capacityExceeded = guestCount > selectedCourtyard.capacity
  const canConfirm =
    !capacityExceeded &&
    (selectedStatus === "available" || selectedStatus === "limited") &&
    /^1[3-9]\d{9}$/.test(phone.trim())

  useEffect(() => {
    fetch(`/api/v1/activities?courtyardId=${selectedCourtyard.id}`)
      .then(async (response) => {
        if (!response.ok) return { data: [] }
        return (await response.json().catch(() => ({ data: [] }))) as { data?: CourtyardActivity[] }
      })
      .then((payload: { data?: CourtyardActivity[] }) => setActivities(payload.data ?? []))
      .catch((error) => {
        console.error("Courtyard activities failed:", error)
        setActivities([])
      })
  }, [selectedCourtyard.id])

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
      const response = await fetchWithAuth("/api/v1/courtyard-bookings", {
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
      rememberTouristIdentity(phone)
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
        <PanelTitle icon={<BedDouble aria-hidden="true" className="h-4 w-4" />}>{t("list.eyebrow")}</PanelTitle>
        <h2 className="mt-3 break-words text-3xl font-extrabold">{t("list.title")}</h2>
        <p className="mt-3 break-words text-sm leading-7 text-ink/68">{t("list.body")}</p>

        <div className="mt-6 grid gap-4">
          {courtyardOptions.map((courtyard) => {
            const active = courtyard.id === selectedCourtyard.id
            const status = resolveInventoryStatus(courtyard, selectedDateOption.status)

            return (
              <article
                className={active ? "choice-card choice-card-active grid overflow-hidden p-0 md:grid-cols-[220px_1fr]" : "choice-card grid overflow-hidden p-0 md:grid-cols-[220px_1fr]"}
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
                      <h3 className="break-words text-xl font-extrabold">{t(courtyard.nameKey)}</h3>
                      <p className="mt-1 text-sm text-ink/58">{t(courtyard.locationKey)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[status]}`}>
                      {t(`inventory.${status}`)}
                    </span>
                  </div>

                  <p className="mt-3 break-words text-sm leading-6 text-ink/68">{t(courtyard.summaryKey)}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {courtyard.amenities.map((amenity) => (
                      <span className="rounded-full bg-rice px-3 py-1 text-xs font-semibold text-ink/66" key={amenity}>
                        {t(amenity)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricTile label={t("list.capacity")} tone="muted" value={courtyard.capacity} />
                    <MetricTile label={t("list.price")} tone="muted" value={t(courtyard.priceLabel)} />
                    <MetricTile label={t("list.minNights")} tone="muted" value={courtyard.minNights} />
                  </div>

                  <button
                    className={active ? "btn-primary mt-5 h-10 px-5 bg-ink hover:bg-moss" : "btn-secondary mt-5 h-10 px-5"}
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
        <PanelTitle icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />} tone="lychee">{t("form.eyebrow")}</PanelTitle>
        <h2 className="mt-3 break-words text-2xl font-extrabold">{t("form.title")}</h2>

        <div className="mt-5 grid gap-4">
          <FieldLabel label={t("form.dateLabel")}>
            <select
              className="select-control w-full"
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
          </FieldLabel>

          <FieldLabel label={t("form.guestsLabel")}>
            <select
              className="select-control w-full"
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
          </FieldLabel>

          <div>
            <div className="text-sm font-semibold">{t("form.paymentModeLabel")}</div>
            <SegmentedControl
              className="mt-2 grid-cols-2"
              labelFor={(value) => t(paymentModeOptions.find((option) => option.value === value)?.labelKey ?? "paymentModes.deposit")}
              onChange={(value) => {
                setPaymentMode(value)
                setOrder(null)
                setSubmitError(false)
              }}
              options={paymentModeOptions.map((option) => option.value) as PaymentMode[]}
              value={paymentMode}
            />
          </div>
          <FieldLabel label={systemT("touristIdentity.phone")}>
            <input className="input-control" inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder={systemT("touristIdentity.phonePlaceholder")} value={phone} />
          </FieldLabel>
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

        <div className="mt-5 rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CircleAlert aria-hidden="true" className="h-4 w-4 text-water" />
            {t("notice.title")}
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-ink/66">{t(selectedCourtyard.bookingNotice)}</p>
        </div>

        <div className="mt-5 rounded-lg border border-line p-4">
          <div className="text-sm font-bold">{t("notice.activitiesTitle")}</div>
          <div className="mt-3 grid gap-2">
            {activities.length > 0 ? (
              activities.slice(0, 3).map((activity) => (
                <div className="rounded-md bg-rice p-3 text-sm" key={activity.id}>
                  <div className="font-extrabold">{activity.title}</div>
                  <div className="mt-1 text-ink/58">{activity.scheduledDate} {activity.scheduledTime}</div>
                  <div className="mt-1 text-ink/58">{activity.bookedCount}/{activity.maxCapacity} / {activity.status}</div>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-ink/58">{t("notice.activitiesEmpty")}</p>
            )}
          </div>
        </div>

        {capacityExceeded ? (
          <InlineNotice className="mt-4" tone="danger">{t("messages.capacityExceeded")}</InlineNotice>
        ) : null}
        {submitError ? (
          <InlineNotice className="mt-4" tone="danger">{t("messages.submitFailed")}</InlineNotice>
        ) : null}

        <button
          className={
            canConfirm && !isSubmitting
              ? "btn-primary mt-5 w-full bg-ink hover:bg-moss"
              : "btn-primary mt-5 w-full"
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
