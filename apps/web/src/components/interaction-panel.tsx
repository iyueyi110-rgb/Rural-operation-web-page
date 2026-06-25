"use client"

import { Camera, Droplets, Leaf, NotebookPen, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

import { EmptyState, FieldLabel, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

interface InteractionTask {
  id: string
  adoptionId: string
  taskType: "watering" | "fertilizing" | "photo_upload" | "diary" | "share"
  title: string
  description?: string
  status: string
  points: number
}

const icons = { watering: Droplets, fertilizing: Leaf, photo_upload: Camera, diary: NotebookPen, share: Share2 }

export function InteractionPanel({ treeId, treeCode }: { treeId: string; treeCode: string }) {
  const t = useTranslations("villagerSystem")
  const [phone, setPhone] = useState("")
  const [adoptionId, setAdoptionId] = useState("")
  const [tasks, setTasks] = useState<InteractionTask[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState("")

  const load = useCallback(async (currentPhone: string, currentAdoptionId: string) => {
    if (!currentPhone || !currentAdoptionId) return
    const response = await fetch(`/api/v1/interactions?adoptionId=${encodeURIComponent(currentAdoptionId)}&adopterPhone=${encodeURIComponent(currentPhone)}&status=pending`)
    if (response.ok) setTasks(((await response.json()) as { data: InteractionTask[] }).data)
  }, [])

  useEffect(() => {
    const storedPhone = window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    if (!storedPhone) return
    setPhone(storedPhone)
    fetch(`/api/v1/tree-adoptions?adopterPhone=${encodeURIComponent(storedPhone)}`)
      .then((response) => response.json())
      .then((result: { data?: Array<{ id: string; treeId: string; status: string; tree?: { treeCode?: string } }> }) => {
        const adoption = result.data?.find((item) => item.status === "active" && (item.treeId === treeId || item.tree?.treeCode === treeCode))
        if (!adoption) return
        setAdoptionId(adoption.id)
        void load(storedPhone, adoption.id)
      })
      .catch(() => undefined)
  }, [load, treeCode, treeId])

  if (!adoptionId) return null

  async function complete(task: InteractionTask, file?: File) {
    setBusy(task.id)
    try {
      let imageUrl: string | undefined
      if (file) {
        const form = new FormData()
        form.set("file", file)
        form.set("adoptionId", adoptionId)
        form.set("adopterPhone", phone)
        const upload = await fetch("/api/v1/interactions/upload", { method: "POST", body: form })
        if (!upload.ok) throw new Error("upload failed")
        imageUrl = ((await upload.json()) as { data: { url: string } }).data.url
      }
      if (task.taskType === "share") await navigator.clipboard.writeText(t("interactions.shareText", { treeCode }))
      const response = await fetch("/api/v1/interactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, adopterPhone: phone, status: "completed", note: notes[task.id], imageUrl }) })
      if (!response.ok) throw new Error("completion failed")
      await load(phone, adoptionId)
    } finally { setBusy("") }
  }

  return (
    <SurfacePanel>
      <PanelTitle tone="moss">{t("interactions.eyebrow")}</PanelTitle>
      <h2 className="mt-2 text-2xl font-extrabold">{t("interactions.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58">{t("interactions.body")}</p>
      <div className="mt-5 grid gap-3">
        {tasks.length === 0 ? <EmptyState title={t("interactions.empty")} /> : tasks.map((task) => {
          const Icon = icons[task.taskType]
          return (
            <article className="rounded-lg border border-line p-4" key={task.id}>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-water/10 p-2 text-water"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3"><h3 className="font-extrabold">{task.title}</h3><span className="text-xs font-bold text-moss">+{task.points || t(`interactions.points.${task.taskType}`)}</span></div>
                  <p className="mt-1 text-sm leading-6 text-ink/55">{task.description || t(`interactions.descriptions.${task.taskType}`)}</p>
                  {["watering", "fertilizing", "diary"].includes(task.taskType) ? (
                    <FieldLabel className="mt-3" label={t("interactions.notePlaceholder")}>
                      <textarea className="textarea-control min-h-20" onChange={(event) => setNotes((value) => ({ ...value, [task.id]: event.target.value }))} value={notes[task.id] ?? ""} />
                    </FieldLabel>
                  ) : null}
                  {task.taskType === "photo_upload" ? <label className="btn-primary mt-3 h-10 cursor-pointer bg-ink px-4 hover:bg-moss"><input accept="image/*" className="sr-only" disabled={busy===task.id} onChange={(event) => { const file=event.target.files?.[0]; if(file) void complete(task,file) }} type="file" />{t("interactions.upload")}</label> : <button className="btn-primary mt-3 h-10 bg-ink px-5 hover:bg-moss" disabled={busy===task.id} onClick={() => void complete(task)} type="button">{busy===task.id?t("common.saving"):t(`interactions.actions.${task.taskType}`)}</button>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </SurfacePanel>
  )
}
