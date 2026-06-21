"use client"

import { ClipboardPlus, Siren } from "lucide-react"
import { useState } from "react"

import { fetchAdminApi } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

export interface ActiveAlertRow {
  id: string
  alertType: string
  nodeId?: string
  severity: string
  message: string
  status: string
  createdAt: string
}

interface ActiveAlertsPanelProps {
  alerts: ActiveAlertRow[]
  onAssigned?: () => void
}

export function ActiveAlertsPanel({
  alerts,
  onAssigned,
}: ActiveAlertsPanelProps) {
  const [busyId, setBusyId] = useState("")
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [message, setMessage] = useState("")

  async function assign(alert: ActiveAlertRow) {
    setBusyId(alert.id)
    setMessage("")

    try {
      await fetchAdminApi("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: `处理${alertTypeLabel(alert.alertType)}`,
          description: alert.message,
          taskType: "maintenance",
          nodeId: alert.nodeId ?? "",
          earnings: 0,
        }),
      })
      await fetchAdminApi("/alerts", {
        method: "PATCH",
        body: JSON.stringify({ id: alert.id, status: "acknowledged" }),
      })
      setAssignedIds((current) => [...current, alert.id])
      setMessage("告警已确认并生成处置任务。")
      onAssigned?.()
    } catch {
      setMessage("派单失败，请检查告警和任务接口。")
    } finally {
      setBusyId("")
    }
  }

  if (!alerts.length) {
    return (
      <div className="grid gap-2">
        <p aria-live="polite" className="text-xs font-semibold text-orange-200">
          {message}
        </p>
        <p className="text-sm font-semibold text-white/45">暂无活跃告警。</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p
        aria-live="polite"
        className="min-h-5 text-xs font-semibold text-orange-200"
      >
        {message}
      </p>
      {alerts.slice(0, 4).map((alert) => {
        const assigned = assignedIds.includes(alert.id)
        const highSeverity = ["high", "urgent", "critical"].includes(
          alert.severity,
        )

        return (
          <article
            className={`rounded-lg bg-black/15 p-3 ${highSeverity ? "admin-alert-blink" : ""}`}
            key={alert.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-extrabold text-orange-300">
                  <Siren aria-hidden="true" className="h-4 w-4" />
                  {alertTypeLabel(alert.alertType)} · {alert.severity}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/58">
                  {alert.message}
                </p>
              </div>
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-orange-300 px-3 text-xs font-extrabold text-[#25170b] transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={busyId === alert.id || assigned}
                onClick={() => assign(alert)}
                type="button"
              >
                <ClipboardPlus aria-hidden="true" className="h-3.5 w-3.5" />
                {assigned ? "已派单" : "派单"}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function alertTypeLabel(type: string) {
  return (
    adminCopy.alerts.types[type as keyof typeof adminCopy.alerts.types] ?? type
  )
}
