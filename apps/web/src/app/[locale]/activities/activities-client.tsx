"use client"

import { CalendarDays, CheckCircle2, CircleAlert, Filter, UsersRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { EmptyState, FieldLabel, InlineNotice, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

interface Activity {
  id: string
  activityType: string
  title: string
  description: string
  maxCapacity: number
  bookedCount: number
  price?: number
  scheduledDate: string
  scheduledTime: string
  status: string
}

interface BookingResult {
  id: string
  status: string
  createdAt: string
}

const activityTypes = ["", "village_feast", "food_class", "study", "workshop", "exhibition", "co_living"]

export function ActivitiesClient() {
  const t = useTranslations("activities")
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityType, setActivityType] = useState("")
  const [date, setDate] = useState("")
  const [guestCount, setGuestCount] = useState(2)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (activityType) params.set("activityType", activityType)
    if (date) params.set("date", date)

    fetch(`/api/v1/activities?${params}`)
      .then(async (response) => {
        if (!response.ok) return { data: [] }
        return (await response.json().catch(() => ({ data: [] }))) as { data?: Activity[] }
      })
      .then((payload: { data?: Activity[] }) => setActivities(payload.data ?? []))
      .catch((error) => {
        console.error("Activities failed:", error)
        setActivities([])
      })
  }, [activityType, date])

  async function bookActivity(activity: Activity) {
    setMessage("")
    setBooking(null)
    const response = await fetch("/api/v1/activity-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId: activity.id, guestName, guestPhone, guestCount }),
    })

    if (!response.ok) {
      setMessage(t("messages.bookingFailed"))
      return
    }

    const payload = (await response.json()) as { data: BookingResult }
    setBooking(payload.data)
    setMessage(t("messages.bookingConfirmed"))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <SurfacePanel>
          <PanelTitle icon={<Filter aria-hidden="true" className="h-4 w-4" />}>
            {t("filters.title")}
          </PanelTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldLabel label={t("filters.type")}>
              <select className="select-control" onChange={(event) => setActivityType(event.target.value)} value={activityType}>
                {activityTypes.map((type) => (
                  <option key={type || "all"} value={type}>
                    {type ? t(`types.${type}`) : t("filters.all")}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label={t("filters.date")}>
              <input className="input-control" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            </FieldLabel>
          </div>
        </SurfacePanel>

        {activities.length === 0 ? (
          <EmptyState
            body={t("messages.emptyBody")}
            icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
            title={t("messages.empty")}
          />
        ) : null}

        {activities.map((activity) => {
          const disabled = activity.status === "full" || activity.status === "cancelled"
          return (
            <article className="choice-card" key={activity.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-water">{t(`types.${activity.activityType}`)}</div>
                  <h2 className="mt-2 text-xl font-extrabold">{activity.title}</h2>
                </div>
                <span className="status-chip border-line bg-rice text-ink/62">{t(`statuses.${activity.status}`)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-ink/66">{activity.description}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-ink/58">
                <span>{activity.scheduledDate} {activity.scheduledTime}</span>
                <span>{t("card.capacity", { booked: activity.bookedCount, max: activity.maxCapacity })}</span>
                <span>{activity.price ? `¥${activity.price}` : t("card.offlinePrice")}</span>
              </div>
              <button
                className="btn-secondary mt-4 h-10 px-5 data-[primary=true]:border-ink data-[primary=true]:bg-ink data-[primary=true]:text-white"
                data-primary={!disabled && guestName && guestPhone ? "true" : "false"}
                disabled={disabled || !guestName || !guestPhone}
                onClick={() => bookActivity(activity)}
                type="button"
              >
                {disabled ? t(`actions.${activity.status}`) : t("actions.book")}
              </button>
            </article>
          )
        })}
      </div>

      <aside className="h-fit rounded-xl border border-line bg-surface p-5 shadow-[0_12px_28px_rgba(25,32,27,0.08)] lg:sticky lg:top-20">
        <PanelTitle icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />} tone="lychee">
          {t("form.title")}
        </PanelTitle>
        <p className="mt-3 text-sm leading-6 text-ink/62">{t("form.body")}</p>
        <div className="mt-4 grid gap-3">
          <FieldLabel label={t("form.name")}>
            <input className="input-control" onChange={(event) => setGuestName(event.target.value)} value={guestName} />
          </FieldLabel>
          <FieldLabel label={t("form.phone")}>
            <input className="input-control" inputMode="tel" onChange={(event) => setGuestPhone(event.target.value)} value={guestPhone} />
          </FieldLabel>
          <FieldLabel label={t("form.guestCount")}>
            <select className="select-control" onChange={(event) => setGuestCount(Number(event.target.value))} value={guestCount}>
              {[1, 2, 3, 4, 6, 8].map((count) => <option key={count} value={count}>{t("form.guestCountValue", { count })}</option>)}
            </select>
          </FieldLabel>
        </div>
        {message ? (
          <InlineNotice className="mt-4" icon={<CircleAlert aria-hidden="true" className="h-4 w-4" />} tone={booking ? "success" : "neutral"}>
            {message}
          </InlineNotice>
        ) : null}
        {booking ? (
          <SurfacePanel className="mt-4" tone="success">
            <div className="flex items-center gap-2 font-bold text-moss"><CheckCircle2 className="h-4 w-4" />{t("order.title")}</div>
            <div className="mt-2 break-words text-sm text-ink/64">{booking.id}</div>
          </SurfacePanel>
        ) : null}
        <div className="mt-5 rounded-lg bg-rice p-4 text-sm leading-6 text-ink/62">
          <div className="flex items-center gap-2 font-bold text-ink">
            <UsersRound aria-hidden="true" className="h-4 w-4 text-water" />
            {t("form.noteTitle")}
          </div>
          <p className="mt-2">{t("form.noteBody")}</p>
        </div>
      </aside>
    </div>
  )
}
