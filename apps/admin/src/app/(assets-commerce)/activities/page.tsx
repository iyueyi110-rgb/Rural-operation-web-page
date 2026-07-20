"use client"

import { useCallback, useEffect, useState } from "react"

import {
  AdminDataTable,
  type TableColumn,
} from "@admin/components/admin-data-table"
import { AdminNotice } from "@admin/components/admin-page-shell"
import {
  adminApiBase,
  fetchAdminApi,
  fetchWithTimeout,
} from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface ActivityRow extends Record<string, unknown> {
  id: string
  courtyardId: string
  activityType: string
  title: string
  maxCapacity: number
  bookedCount: number
  scheduledDate: string
  scheduledTime: string
  status: string
}

interface BookingRow extends Record<string, unknown> {
  id: string
  activityId: string
  guestName: string
  guestCount: number
  status: string
  createdAt: string
}

export default function ActivitiesAdminPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState("")
  const [message, setMessage] = useState("")
  const [isDemo, setIsDemo] = useState(false)
  const [form, setForm] = useState({
    courtyardId: "ridge-shared-courtyard",
    activityType: "food_class",
    title: "",
    description: "",
    maxCapacity: "12",
    price: "",
    scheduledDate: today(),
    scheduledTime: "10:00",
  })

  const loadActivities = useCallback(async () => {
    const response = await fetchWithTimeout(`${adminApiBase}/activities`)
    const payload = (await response.json()) as {
      data?: ActivityRow[]
      meta?: { degraded?: boolean; demo?: boolean }
    }
    setActivities(payload.data ?? [])
    setIsDemo(payload.meta?.degraded === true || payload.meta?.demo === true)
  }, [])

  const loadBookings = useCallback(async (activityId: string) => {
    if (!activityId) {
      setBookings([])
      return
    }
    const response = await fetchWithTimeout(
      `${adminApiBase}/activity-bookings?activityId=${activityId}`,
    )
    const payload = (await response.json()) as { data?: BookingRow[] }
    setBookings(payload.data ?? [])
  }, [])

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  useEffect(() => {
    void loadBookings(selectedActivityId)
  }, [loadBookings, selectedActivityId])

  async function createActivity() {
    try {
      await fetchAdminApi("/activities", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          maxCapacity: Number(form.maxCapacity),
          price: form.price ? Number(form.price) : null,
        }),
      })
      setMessage("活动已创建。")
      setForm((current) => ({ ...current, title: "", description: "" }))
      await loadActivities()
    } catch {
      setMessage("活动创建失败。")
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetchAdminApi("/activities", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      })
      setMessage("活动状态已更新。")
      await loadActivities()
    } catch {
      setMessage("活动状态更新失败。")
    }
  }

  const activityColumns: Array<TableColumn<ActivityRow>> = [
    { key: "title", label: "活动" },
    { key: "courtyardId", label: "院落" },
    { key: "activityType", label: "类型" },
    { key: "scheduledDate", label: "日期" },
    { key: "scheduledTime", label: "时间" },
    {
      key: "bookedCount",
      label: "已订",
      render: (_value, row) => `${row.bookedCount}/${row.maxCapacity}`,
    },
    { key: "status", label: "状态" },
    {
      key: "id",
      label: "操作",
      render: (_value, row) => (
        <span className="flex gap-2">
          <button
            className="text-water"
            onClick={() => setSelectedActivityId(row.id)}
            type="button"
          >
            预约
          </button>
          <button
            className="text-lychee"
            onClick={() => updateStatus(row.id, "cancelled")}
            type="button"
          >
            取消
          </button>
        </span>
      ),
    },
  ]

  const bookingColumns: Array<TableColumn<BookingRow>> = [
    { key: "guestName", label: "姓名" },
    { key: "guestCount", label: "人数" },
    { key: "status", label: "状态" },
    {
      key: "createdAt",
      label: "时间",
      render: (value) => new Date(String(value)).toLocaleString("zh-CN"),
    },
  ]

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">
          {adminCopy.shell.subtitle}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {adminCopy.activities.title}
        </h1>
      </header>

      {message ? (
        <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">
          {message}
        </div>
      ) : null}
      {isDemo ? (
        <AdminNotice>正式活动数据暂不可用，当前展示降级演示数据。</AdminNotice>
      ) : null}

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">
          {adminCopy.activities.create}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="标题"
            value={form.title}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, activityType: event.target.value })
            }
            placeholder="类型"
            value={form.activityType}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, courtyardId: event.target.value })
            }
            placeholder="院落 ID"
            value={form.courtyardId}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, maxCapacity: event.target.value })
            }
            placeholder="容量"
            value={form.maxCapacity}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, scheduledDate: event.target.value })
            }
            type="date"
            value={form.scheduledDate}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, scheduledTime: event.target.value })
            }
            type="time"
            value={form.scheduledTime}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, price: event.target.value })
            }
            placeholder="价格"
            value={form.price}
          />
          <button
            className="h-10 rounded-full bg-ink px-4 text-sm font-bold text-white"
            onClick={createActivity}
            type="button"
          >
            {adminCopy.activities.create}
          </button>
        </div>
        <textarea
          className="mt-3 min-h-20 w-full rounded-md border border-stone bg-rice p-3 text-sm font-semibold"
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          placeholder="活动说明"
          value={form.description}
        />
      </section>

      <AdminDataTable
        columns={activityColumns}
        emptyLabel={adminCopy.activities.noData}
        rows={activities}
      />

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">
          {adminCopy.activities.bookings}
        </h2>
        <div className="mt-4">
          <AdminDataTable
            columns={bookingColumns}
            emptyLabel="暂无预约。"
            rows={bookings}
          />
        </div>
      </section>
    </div>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(
    new Date(),
  )
}
