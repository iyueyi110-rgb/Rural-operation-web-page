"use client"

import { BookOpen, Camera, ChevronDown, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { fetchWithVillagerAuth } from "@web/lib/villager-auth-client"
import type { VillagerTask } from "@web/lib/villager-portal"
import {
  EmptyState,
  PanelTitle,
  SegmentedControl,
  SurfacePanel,
} from "@web/components/subpage-ui"

const filters = ["pending", "active", "completed"] as const

export function VillagerTasksClient() {
  const t = useTranslations("villagerSystem")
  const [tasks, setTasks] = useState<VillagerTask[]>([])
  const [filter, setFilter] = useState<(typeof filters)[number]>("pending")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("")
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("")
  const [knowledgeCitations, setKnowledgeCitations] = useState<
    Array<{ title: string; version: string; section: string; quote: string }>
  >([])
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeError, setKnowledgeError] = useState("")
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [evidenceDescription, setEvidenceDescription] = useState("")
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState("")

  async function load() {
    setLoading(true)
    const response = await fetchWithVillagerAuth("/api/v1/villager/me/tasks")
    if (response.ok)
      setTasks(((await response.json()) as { data: VillagerTask[] }).data)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function advance(task: VillagerTask) {
    const next =
      task.status === "pending"
        ? "accepted"
        : task.status === "accepted"
          ? "in_progress"
          : "completed"
    const response = await fetchWithVillagerAuth("/api/v1/villager/me/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        task.adoptionId
          ? {
              id: task.id,
              action: task.status === "pending" ? "accept" : "start",
              expectedVersion: task.version,
            }
          : { id: task.id, status: next },
      ),
    })
    if (response.ok) await load()
  }

  async function askKnowledge(task: VillagerTask) {
    const question = knowledgeQuestion.trim()
    if (!question) return
    setKnowledgeLoading(true)
    setKnowledgeError("")
    const response = await fetchWithVillagerAuth("/api/v1/knowledge/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: { taskType: task.taskType } }),
    })
    const payload = (await response.json().catch(() => null)) as {
      data?: { answer: string; citations?: typeof knowledgeCitations }
      error?: { message?: string }
    } | null
    if (response.ok && payload?.data) {
      setKnowledgeAnswer(payload.data.answer)
      setKnowledgeCitations(payload.data.citations ?? [])
    } else
      setKnowledgeError(payload?.error?.message ?? t("tasks.knowledge.failed"))
    setKnowledgeLoading(false)
  }

  async function submitEvidence(task: VillagerTask) {
    if (evidenceFiles.length < 2 || !evidenceDescription.trim()) {
      setEvidenceError(t("tasks.evidence.requirements"))
      return
    }
    setEvidenceLoading(true)
    setEvidenceError("")
    try {
      const media = []
      for (const file of evidenceFiles.slice(0, 8)) {
        const form = new FormData()
        form.set("file", file)
        form.set("taskId", task.id)
        const upload = await fetchWithVillagerAuth(
          "/api/v1/fulfillment/evidence/upload",
          { method: "POST", body: form },
        )
        if (!upload.ok) throw new Error("UPLOAD_FAILED")
        media.push(
          (
            (await upload.json()) as {
              data: {
                url: string
                hash: string
                mimeType: string
                size: number
              }
            }
          ).data,
        )
      }
      const response = await fetchWithVillagerAuth(
        "/api/v1/fulfillment/evidence",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            description: evidenceDescription.trim(),
            media,
          }),
        },
      )
      if (!response.ok) throw new Error("SUBMIT_FAILED")
      setEvidenceFiles([])
      setEvidenceDescription("")
      await load()
    } catch {
      setEvidenceError(t("tasks.evidence.failed"))
    } finally {
      setEvidenceLoading(false)
    }
  }

  const visible = tasks.filter((task) => {
    if (filter === "pending") return task.status === "pending"
    if (filter === "active")
      return [
        "accepted",
        "in_progress",
        "submitted",
        "rejected",
        "resubmitted",
        "exception_reported",
        "overdue",
      ].includes(task.status)
    return ["completed", "approved", "settled"].includes(task.status)
  })

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <PanelTitle tone="moss">{t("tasks.eyebrow")}</PanelTitle>
      <h1 className="mt-2 text-3xl font-extrabold">{t("tasks.title")}</h1>
      <SegmentedControl
        className="mt-6 grid-cols-3"
        labelFor={(item) => t(`tasks.filters.${item}`)}
        onChange={setFilter}
        options={filters}
        value={filter}
      />
      <div className="mt-5 grid gap-3">
        {loading ? <SurfacePanel>{t("common.loading")}</SurfacePanel> : null}
        {!loading && visible.length === 0 ? (
          <EmptyState title={t("tasks.empty")} />
        ) : null}
        {visible.map((task) => (
          <SurfacePanel key={task.id}>
            <button
              className="flex w-full items-start justify-between gap-4 text-left"
              onClick={() => {
                setExpanded(expanded === task.id ? null : task.id)
                setKnowledgeOpen(false)
                setKnowledgeAnswer("")
                setKnowledgeCitations([])
              }}
              type="button"
            >
              <div>
                <div className="text-lg font-extrabold">{task.title}</div>
                <div className="mt-1 text-xs font-semibold text-water">
                  {task.taskType} / {task.node?.slug ?? t("tasks.noNode")}
                </div>
              </div>
              <div className="flex items-center gap-2 font-bold text-moss">
                ¥{task.earnings}
                <ChevronDown
                  className={`h-4 w-4 transition ${expanded === task.id ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {expanded === task.id ? (
              <div className="mt-4 border-t border-stone pt-4">
                <p className="text-sm leading-7 text-ink/62">
                  {task.description || t("tasks.noDescription")}
                </p>
                <p className="mt-2 text-xs text-ink/45">
                  {task.deadlineAt
                    ? new Date(task.deadlineAt).toLocaleString()
                    : task.scheduledDate || t("tasks.noDeadline")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(!task.adoptionId && task.status !== "completed") ||
                  (task.adoptionId &&
                    ["pending", "accepted"].includes(task.status)) ? (
                    <button
                      className="btn-primary h-10 px-5 bg-ink hover:bg-moss"
                      onClick={() => void advance(task)}
                      type="button"
                    >
                      {t(`tasks.actions.${task.status}`)}
                    </button>
                  ) : null}
                  <button
                    className="btn-secondary btn-sm flex h-10 items-center gap-2 px-4"
                    onClick={() => setKnowledgeOpen((value) => !value)}
                    type="button"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("tasks.knowledge.open")}
                  </button>
                </div>
                {task.adoptionId &&
                ["in_progress", "rejected"].includes(task.status) ? (
                  <div className="mt-4 rounded-lg border border-stone bg-rice p-4">
                    <div className="flex items-center gap-2 font-extrabold">
                      <Camera className="h-4 w-4 text-moss" />
                      {t("tasks.evidence.title")}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ink/55">
                      {t("tasks.evidence.help")}
                    </p>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-3 block w-full text-sm"
                      multiple
                      onChange={(event) =>
                        setEvidenceFiles(Array.from(event.target.files ?? []))
                      }
                      type="file"
                    />
                    <textarea
                      className="mt-3 min-h-20 w-full rounded-md border border-stone bg-white px-3 py-2 text-sm"
                      onChange={(event) =>
                        setEvidenceDescription(event.target.value)
                      }
                      placeholder={t("tasks.evidence.placeholder")}
                      value={evidenceDescription}
                    />
                    {evidenceError ? (
                      <p className="mt-2 text-xs font-bold text-lychee">
                        {evidenceError}
                      </p>
                    ) : null}
                    <button
                      className="btn-primary mt-3 h-10 px-5 bg-ink hover:bg-moss disabled:opacity-50"
                      disabled={evidenceLoading}
                      onClick={() => void submitEvidence(task)}
                      type="button"
                    >
                      {evidenceLoading
                        ? t("common.saving")
                        : t("tasks.evidence.submit")}
                    </button>
                  </div>
                ) : null}
                {knowledgeOpen ? (
                  <div className="mt-4 rounded-lg border border-stone bg-rice p-4">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <textarea
                        className="min-h-20 rounded-md border border-stone bg-white px-3 py-2 text-sm"
                        onChange={(event) =>
                          setKnowledgeQuestion(event.target.value)
                        }
                        placeholder={t("tasks.knowledge.placeholder")}
                        value={knowledgeQuestion}
                      />
                      <button
                        className="btn-primary flex h-10 items-center gap-2 px-4 bg-ink hover:bg-moss disabled:opacity-50 sm:self-end"
                        disabled={knowledgeLoading || !knowledgeQuestion.trim()}
                        onClick={() => void askKnowledge(task)}
                        type="button"
                      >
                        <Send className="h-4 w-4" />
                        {knowledgeLoading
                          ? t("tasks.knowledge.asking")
                          : t("tasks.knowledge.ask")}
                      </button>
                    </div>
                    {knowledgeError ? (
                      <p className="mt-3 text-xs font-bold text-lychee">
                        {knowledgeError}
                      </p>
                    ) : null}
                    {knowledgeAnswer ? (
                      <div className="mt-4 border-t border-stone pt-4">
                        <p className="text-sm leading-7 text-ink/72">
                          {knowledgeAnswer}
                        </p>
                        {knowledgeCitations.map((citation) => (
                          <details
                            className="mt-2 rounded-md border border-stone bg-white px-3 py-2"
                            key={`${citation.title}-${citation.section}`}
                          >
                            <summary className="cursor-pointer text-xs font-bold">
                              {citation.title} · {citation.section} ·{" "}
                              {citation.version}
                            </summary>
                            <p className="mt-2 border-l-2 border-moss pl-3 text-xs leading-6 text-ink/62">
                              {citation.quote}
                            </p>
                          </details>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </SurfacePanel>
        ))}
      </div>
    </main>
  )
}
