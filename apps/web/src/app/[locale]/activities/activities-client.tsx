"use client"

import { CalendarDays, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"

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
      .then((response) => response.json())
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
      setMessage("预约失败，请检查姓名、手机号和人数。")
      return
    }

    const payload = (await response.json()) as { data: BookingResult }
    setBooking(payload.data)
    setMessage("活动预约已确认。")
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-2">
          <select className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setActivityType(event.target.value)} value={activityType}>
            {activityTypes.map((type) => <option key={type || "all"} value={type}>{type || "全部类型"}</option>)}
          </select>
          <input className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </div>

        {activities.map((activity) => {
          const disabled = activity.status === "full" || activity.status === "cancelled"
          return (
            <article className="rounded-lg border border-stone bg-white p-5 shadow-soft" key={activity.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-water">{activity.activityType}</div>
                  <h2 className="mt-2 text-xl font-extrabold">{activity.title}</h2>
                </div>
                <span className="rounded-full bg-rice px-3 py-1 text-xs font-bold">{activity.status}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-ink/66">{activity.description}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-ink/58">
                <span>{activity.scheduledDate} {activity.scheduledTime}</span>
                <span>{activity.bookedCount}/{activity.maxCapacity}</span>
                <span>{activity.price ? `¥${activity.price}` : "线下确认"}</span>
              </div>
              <button
                className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:bg-ink/20 disabled:text-ink/46"
                disabled={disabled || !guestName || !guestPhone}
                onClick={() => bookActivity(activity)}
                type="button"
              >
                {disabled ? (activity.status === "full" ? "已满" : "已取消") : "预约活动"}
              </button>
            </article>
          )
        })}
      </div>

      <aside className="h-fit rounded-lg border border-stone bg-white p-5 shadow-soft lg:sticky lg:top-6">
        <div className="flex items-center gap-2 text-sm font-bold text-lychee">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          预约信息
        </div>
        <div className="mt-4 grid gap-3">
          <input className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setGuestName(event.target.value)} placeholder="姓名" value={guestName} />
          <input className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setGuestPhone(event.target.value)} placeholder="手机号" value={guestPhone} />
          <select className="h-11 rounded-md border border-stone bg-rice px-3" onChange={(event) => setGuestCount(Number(event.target.value))} value={guestCount}>
            {[1, 2, 3, 4, 6, 8].map((count) => <option key={count} value={count}>{count} 人</option>)}
          </select>
        </div>
        {message ? <p className="mt-4 rounded-md bg-rice p-3 text-sm font-semibold text-ink/62">{message}</p> : null}
        {booking ? (
          <div className="mt-4 rounded-md bg-moss/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-moss"><CheckCircle2 className="h-4 w-4" />预约已生成</div>
            <div className="mt-2">{booking.id}</div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
