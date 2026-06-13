"use client"

import { Search } from "lucide-react"
import { useState } from "react"

interface AdoptionRecord {
  id: string
  treeId: string
  plan: string
  status: string
  createdAt: string
}

export function AdoptionLookup() {
  const [phone, setPhone] = useState("")
  const [records, setRecords] = useState<AdoptionRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("输入认养时预留的手机号，系统会按脱敏号码查询。")

  async function handleLookup() {
    if (!phone.trim()) return
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch(`/api/v1/tree-adoptions?adopterPhone=${encodeURIComponent(phone.trim())}`)
      if (!response.ok) throw new Error("lookup failed")
      const payload = (await response.json()) as { data?: AdoptionRecord[] }
      setRecords(payload.data ?? [])
      setMessage((payload.data ?? []).length > 0 ? "已找到认养记录。" : "暂无匹配认养记录。")
    } catch (caughtError) {
      console.error("Adoption lookup failed:", caughtError)
      setRecords([])
      setMessage("查询失败，请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-stone bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-lychee">
        <Search aria-hidden="true" className="h-4 w-4" />
        我的认养
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="h-11 rounded-md border border-stone bg-rice px-4 text-sm font-semibold outline-none focus:border-ink"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="请输入手机号"
          type="tel"
          value={phone}
        />
        <button
          className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:bg-ink/30"
          disabled={isLoading || !phone.trim()}
          onClick={handleLookup}
          type="button"
        >
          {isLoading ? "查询中" : "查询认养"}
        </button>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink/58">{message}</p>
      <div className="mt-4 grid gap-3">
        {records.map((record) => (
          <article className="rounded-md bg-rice p-4 text-sm" key={record.id}>
            <div className="font-extrabold">{record.id}</div>
            <div className="mt-1 text-ink/62">树木：{record.treeId}</div>
            <div className="mt-1 text-ink/62">方案：{record.plan}</div>
            <div className="mt-1 text-ink/62">状态：{record.status}</div>
            <div className="mt-1 text-ink/46">{new Date(record.createdAt).toLocaleString()}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
