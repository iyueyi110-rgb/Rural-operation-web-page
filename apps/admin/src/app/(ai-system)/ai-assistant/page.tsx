"use client"

import Image from "next/image"
import { BookOpen, Bot, Database, Send, UserRoundCheck } from "lucide-react"
import { useState } from "react"

import { fetchAdminApi } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface ChatItem {
  id: string
  question: string
  answer: string
  status?: string
  citations?: Array<{
    documentId: string
    title: string
    version: string
    section: string
    quote: string
  }>
  allowedRoles?: string[]
  requiresHuman?: boolean
}

type AssistantMode = "knowledge" | "operations"

export default function AiAssistantPage() {
  const [question, setQuestion] = useState("")
  const [items, setItems] = useState<ChatItem[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<AssistantMode>("knowledge")
  const [transferredIds, setTransferredIds] = useState<Set<string>>(new Set())

  async function askQuestion() {
    const trimmed = question.trim()
    if (!trimmed) return

    setIsAsking(true)
    setError("")

    try {
      const path = mode === "knowledge" ? "/knowledge/query" : "/ai/query"
      const payload = await fetchAdminApi<{
        data?: {
          question?: string
          answer: string
          status?: string
          citations?: ChatItem["citations"]
          allowedRoles?: string[]
          requiresHuman?: boolean
        }
        error?: string | { message?: string }
      }>(path, {
        method: "POST",
        body: JSON.stringify({ question: trimmed }),
      })
      if (!payload.data)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : (payload.error?.message ?? adminCopy.aiAssistant.failed),
        )

      const item: ChatItem = {
        id: `${Date.now()}`,
        question: payload.data.question ?? trimmed,
        answer: payload.data.answer,
        status: payload.data.status,
        citations: payload.data.citations,
        allowedRoles: payload.data.allowedRoles,
        requiresHuman: payload.data.requiresHuman,
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

  async function transferToHuman(item: ChatItem) {
    try {
      await fetchAdminApi("/knowledge/escalations", {
        method: "POST",
        body: JSON.stringify({ question: item.question }),
      })
      setTransferredIds((current) => new Set(current).add(item.id))
    } catch {
      setError(adminCopy.aiAssistant.transferFailed)
    }
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">
          {adminCopy.aiAssistant.subtitle}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {adminCopy.aiAssistant.title}
        </h1>
      </header>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div
          className="mb-4 inline-flex rounded-full bg-rice p-1"
          aria-label="AI 助手模式"
        >
          <button
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${mode === "knowledge" ? "bg-ink text-white" : "text-ink/60"}`}
            onClick={() => setMode("knowledge")}
            type="button"
          >
            <BookOpen className="h-4 w-4" />
            {adminCopy.aiAssistant.knowledgeMode}
          </button>
          <button
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${mode === "operations" ? "bg-ink text-white" : "text-ink/60"}`}
            onClick={() => setMode("operations")}
            type="button"
          >
            <Database className="h-4 w-4" />
            {adminCopy.aiAssistant.operationsMode}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-24 rounded-md border border-stone bg-rice px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={
              mode === "knowledge"
                ? adminCopy.aiAssistant.knowledgePlaceholder
                : adminCopy.aiAssistant.operationsPlaceholder
            }
            value={question}
          />
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:bg-ink/30 md:self-end"
            disabled={isAsking || !question.trim()}
            onClick={askQuestion}
            type="button"
          >
            <Send className="h-4 w-4" />
            {isAsking
              ? adminCopy.aiAssistant.asking
              : adminCopy.aiAssistant.ask}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm font-bold text-lychee">{error}</p>
        ) : null}
      </section>

      <section className="grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-stone bg-white p-5 text-sm font-semibold text-ink/58 shadow-soft">
            <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
              <Image
                alt="荔枝枝叶环绕纸质规则手册的知识助手插画"
                className="mx-auto h-auto w-full max-w-44"
                height={1024}
                priority
                src="/images/ai-assistant/knowledge-empty-seedream.webp"
                width={1024}
              />
              <div>
                <Bot className="mb-3 h-5 w-5 text-water" />
                {adminCopy.aiAssistant.empty}
              </div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <article
              className="rounded-lg border border-stone bg-white p-5 shadow-soft"
              key={item.id}
            >
              <div className="text-xs font-bold text-water">
                {adminCopy.aiAssistant.question}
              </div>
              <p className="mt-2 text-sm font-extrabold text-ink">
                {item.question}
              </p>
              <div className="mt-4 text-xs font-bold text-moss">
                {adminCopy.aiAssistant.answer}
              </div>
              <p className="mt-2 text-sm leading-7 text-ink/70">
                {item.answer}
              </p>
              {item.citations?.length ? (
                <div className="mt-5 grid gap-2 border-t border-stone pt-4">
                  <div className="text-xs font-bold text-ink/58">
                    {adminCopy.aiAssistant.citations}
                  </div>
                  {item.citations.map((citation) => (
                    <details
                      className="group rounded-md border border-stone bg-rice px-4 py-3"
                      key={`${item.id}-${citation.documentId}-${citation.section}`}
                    >
                      <summary className="cursor-pointer list-none text-sm font-bold text-ink">
                        {citation.title} · {citation.section}
                        <span className="ml-2 text-xs font-semibold text-water">
                          {citation.version}
                        </span>
                      </summary>
                      <blockquote className="mt-3 border-l-2 border-moss pl-3 text-sm leading-6 text-ink/68">
                        {citation.quote}
                      </blockquote>
                    </details>
                  ))}
                </div>
              ) : null}
              {mode === "knowledge" ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink/55">
                  {item.allowedRoles?.length ? (
                    <span>
                      {adminCopy.aiAssistant.allowedRoles}：
                      {item.allowedRoles.join(" / ")}
                    </span>
                  ) : null}
                  <button
                    className="ml-auto flex items-center gap-2 rounded-full border border-stone px-3 py-2 font-bold text-ink transition hover:border-moss hover:text-moss disabled:opacity-50"
                    disabled={transferredIds.has(item.id)}
                    onClick={() => void transferToHuman(item)}
                    type="button"
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    {transferredIds.has(item.id)
                      ? adminCopy.aiAssistant.transferred
                      : adminCopy.aiAssistant.transfer}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
