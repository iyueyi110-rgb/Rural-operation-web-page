"use client"

import { Copy, WandSparkles } from "lucide-react"
import { useState } from "react"

import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

type ContentType = "narration" | "script" | "social"

const contentTypes: ContentType[] = ["narration", "script", "social"]

export default function ContentFactoryPage() {
  const [form, setForm] = useState({
    type: "narration" as ContentType,
    scene: "古道叙事境",
    activity: "半日游线导览",
    season: "夏季",
    audience: "亲子游客",
  })
  const [result, setResult] = useState("")
  const [message, setMessage] = useState<string>(adminCopy.contentFactory.noSaveNotice)
  const [isGenerating, setIsGenerating] = useState(false)

  async function generateContent() {
    setIsGenerating(true)
    setMessage("")

    try {
      const response = await fetch(`${adminApiBase}/ai/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = (await response.json()) as { data?: { content?: string }; error?: string }

      if (!response.ok || !payload.data?.content) {
        throw new Error(payload.error ?? "AI content generation failed")
      }

      setResult(payload.data.content)
      setMessage(adminCopy.contentFactory.noSaveNotice)
    } catch (error) {
      console.error("Content factory failed:", error)
      setMessage(adminCopy.contentFactory.failed)
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyResult() {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setMessage(adminCopy.contentFactory.copied)
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.contentFactory.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.contentFactory.title}</h1>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <AdminStatCard icon={<WandSparkles className="h-4 w-4" />} label={adminCopy.contentFactory.type} value={adminCopy.contentFactory.types[form.type]} />
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-ink/70">
              {adminCopy.contentFactory.type}
              <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, type: event.target.value as ContentType })} value={form.type}>
                {contentTypes.map((type) => (
                  <option key={type} value={type}>
                    {adminCopy.contentFactory.types[type]}
                  </option>
                ))}
              </select>
            </label>
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, scene: event.target.value })} placeholder={adminCopy.contentFactory.scene} value={form.scene} />
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, activity: event.target.value })} placeholder={adminCopy.contentFactory.activity} value={form.activity} />
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, season: event.target.value })} placeholder={adminCopy.contentFactory.season} value={form.season} />
            <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder={adminCopy.contentFactory.audience} value={form.audience} />
            <button className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-50" disabled={isGenerating} onClick={generateContent} type="button">
              {isGenerating ? adminCopy.contentFactory.generating : adminCopy.contentFactory.generate}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-water">{adminCopy.contentFactory.result}</p>
              <p className="mt-1 text-xs font-semibold text-ink/52">{adminCopy.contentFactory.noSaveNotice}</p>
            </div>
            <button className="flex h-10 items-center gap-2 rounded-full border border-stone px-4 text-sm font-bold" onClick={copyResult} type="button">
              <Copy className="h-4 w-4" />
              {adminCopy.contentFactory.copy}
            </button>
          </div>
          <textarea
            className="mt-4 min-h-[520px] w-full rounded-md border border-stone bg-rice p-4 text-sm leading-7 text-ink"
            onChange={(event) => setResult(event.target.value)}
            placeholder={adminCopy.contentFactory.result}
            value={result}
          />
        </section>
      </div>
    </div>
  )
}
