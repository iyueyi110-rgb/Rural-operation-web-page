"use client"

import { useEffect, useState } from "react"

import { fetchWithAuth, getAuthToken } from "@web/lib/auth-client"
import { consentItems } from "@web/lib/privacy-data"
import { SurfacePanel } from "@web/components/subpage-ui"

interface ConsentRow {
  consentType: string
  granted: boolean
  updatedAt: string | null
}

const consentTypeById: Record<string, string> = {
  "privacy-policy": "privacy_policy",
  "data-collection": "data_collection",
  "ai-processing": "ai_processing",
  location: "location",
}

export function PrivacyConsentsClient({ labels }: { labels: Record<string, { title: string; body: string }> }) {
  const [records, setRecords] = useState<ConsentRow[]>([])
  const [busy, setBusy] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    setLoggedIn(!!token)
    if (!token) return
    fetchWithAuth("/api/v1/privacy/consents")
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((payload) => setRecords(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setRecords([]))
  }, [])

  async function toggle(consentType: string, granted: boolean) {
    setBusy(consentType)
    try {
      const response = await fetchWithAuth("/api/v1/privacy/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentType, granted }),
      })
      const payload = await response.json()
      if (response.ok && payload.data) {
        setRecords((current) => [
          ...current.filter((record) => record.consentType !== consentType),
          payload.data,
        ])
      }
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      {consentItems.map((item) => {
        const consentType = consentTypeById[item.id] ?? item.id
        const record = records.find((entry) => entry.consentType === consentType)
        const granted = record?.granted ?? false
        const label = labels[item.id]

        return (
          <SurfacePanel key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">{label.title}</h2>
              <button
                className={granted ? "rounded-full border border-moss/20 bg-moss/10 px-3 py-1 text-xs font-bold text-moss" : "rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs font-bold text-ink/55"}
                disabled={!loggedIn || busy === consentType}
                onClick={() => toggle(consentType, !granted)}
                type="button"
              >
                {granted ? "已授权" : "未授权"}
              </button>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink/66">{label.body}</p>
            <p className="mt-4 text-xs font-semibold text-ink/46">
              {loggedIn
                ? record?.updatedAt
                  ? `授权时间：${new Date(record.updatedAt).toLocaleString()}`
                  : "尚未记录授权时间"
                : "登录后可切换并持久化授权状态"}
            </p>
          </SurfacePanel>
        )
      })}
    </div>
  )
}
