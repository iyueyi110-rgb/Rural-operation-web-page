"use client"

import { Bot, Send } from "lucide-react"
import { useState } from "react"

import { fetchAdminApi } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface ChatItem {
  id: string
  question: string
  answer: string
}

export default function AiAssistantPage() {
  const [question, setQuestion] = useState("")
  const [items, setItems] = useState<ChatItem[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState("")

  async function askQuestion() {
    const trimmed = question.trim()
    if (!trimmed) return

    setIsAsking(true)
    setError("")

    try {
      const payload = await fetchAdminApi<{ data?: { question: string; answer: string }; error?: string }>("/ai/query", {
        method: "POST",
        body: JSON.stringify({ question: trimmed }),
      })
      if (!payload.data) throw new Error(payload.error ?? adminCopy.aiAssistant.failed)

      const item: ChatItem = {
        id: `${Date.now()}`,
        question: payload.data.question,
        answer: payload.data.answer,
      }
      setItems((current) => [item, ...current])
      setQuestion("")
    } catch (caughtError) {
      console.error("AI assistant query failed:", caughtError)
      setError(adminCopy.aiAssistant.failed)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.aiAssistant.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.aiAssistant.title}</h1>
      </header>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-24 rounded-md border border-stone bg-rice px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={adminCopy.aiAssistant.placeholder}
            value={question}
          />
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:bg-ink/30 md:self-end"
            disabled={isAsking || !question.trim()}
            onClick={askQuestion}
            type="button"
          >
            <Send className="h-4 w-4" />
            {isAsking ? adminCopy.aiAssistant.asking : adminCopy.aiAssistant.ask}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-bold text-lychee">{error}</p> : null}
      </section>

      <section className="grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-stone bg-white p-5 text-sm font-semibold text-ink/58 shadow-soft">
            <Bot className="mb-3 h-5 w-5 text-water" />
            {adminCopy.aiAssistant.empty}
          </div>
        ) : (
          items.map((item) => (
            <article className="rounded-lg border border-stone bg-white p-5 shadow-soft" key={item.id}>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-water">{adminCopy.aiAssistant.question}</div>
              <p className="mt-2 text-sm font-extrabold text-ink">{item.question}</p>
              <div className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-moss">{adminCopy.aiAssistant.answer}</div>
              <p className="mt-2 text-sm leading-7 text-ink/70">{item.answer}</p>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
