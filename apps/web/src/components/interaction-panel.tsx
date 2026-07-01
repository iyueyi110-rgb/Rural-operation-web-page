"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Camera, Droplets, Sprout } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react"

import {
  EmptyState,
  MetricTile,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"
import {
  buildInteractionTaskGroups,
  summarizeInteractionProgress,
  type InteractionTaskGroup,
  type InteractionTaskModel,
} from "@web/lib/interaction-dashboard-model"

interface AdoptionRecord {
  id: string
  treeId: string
  status: string
  tree?: { treeCode?: string }
}

export function InteractionPanel({
  treeId,
  treeCode,
}: {
  treeId: string
  treeCode: string
}) {
  const t = useTranslations("villagerSystem.interactions")
  const common = useTranslations("villagerSystem.common")
  const locale = useLocale()
  const [phone, setPhone] = useState("")
  const [adoptionId, setAdoptionId] = useState("")
  const [tasks, setTasks] = useState<InteractionTaskModel[]>([])
  const [busyId, setBusyId] = useState("")
  const [message, setMessage] = useState("")

  const groups = useMemo(() => buildInteractionTaskGroups(tasks), [tasks])
  const summary = useMemo(() => summarizeInteractionProgress(groups), [groups])

  const load = useCallback(
    async (currentPhone: string, currentAdoptionId: string) => {
      if (!currentPhone || !currentAdoptionId) return
      const response = await fetch(
        `/api/v1/interactions?adoptionId=${encodeURIComponent(currentAdoptionId)}&adopterPhone=${encodeURIComponent(currentPhone)}`,
      )
      if (response.ok) {
        setTasks(
          ((await response.json()) as { data?: InteractionTaskModel[] }).data ??
            [],
        )
      }
    },
    [],
  )

  useEffect(() => {
    const storedPhone =
      window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    if (!storedPhone) return
    setPhone(storedPhone)
    fetch(
      `/api/v1/tree-adoptions?adopterPhone=${encodeURIComponent(storedPhone)}`,
    )
      .then((response) => response.json())
      .then((result: { data?: AdoptionRecord[] }) => {
        const adoption = result.data?.find(
          (item) =>
            item.status === "active" &&
            (item.treeId === treeId || item.tree?.treeCode === treeCode),
        )
        if (!adoption) return
        setAdoptionId(adoption.id)
        void load(storedPhone, adoption.id)
      })
      .catch(() => undefined)
  }, [load, treeCode, treeId])

  if (!adoptionId) return null

  async function quickComplete(group?: InteractionTaskGroup, file?: File) {
    if (!group?.nextTaskId || !phone || !adoptionId) return
    setBusyId(group.id)
    try {
      let imageUrl: string | undefined
      if (file) {
        const form = new FormData()
        form.set("file", file)
        form.set("adoptionId", adoptionId)
        form.set("adopterPhone", phone)
        const upload = await fetch("/api/v1/interactions/upload", {
          method: "POST",
          body: form,
        })
        if (!upload.ok) throw new Error("upload failed")
        imageUrl = ((await upload.json()) as { data?: { url?: string } }).data
          ?.url
      }
      const response = await fetch("/api/v1/interactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: group.nextTaskId,
          adopterPhone: phone,
          status: "completed",
          imageUrl,
        }),
      })
      if (!response.ok) throw new Error("completion failed")
      setMessage(t("states.completed"))
      await load(phone, adoptionId)
    } catch (error) {
      console.error("Quick interaction failed:", error)
      setMessage(t("states.completeFailed"))
    } finally {
      setBusyId("")
    }
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file)
      void quickComplete(
        groups.find((group) => group.taskType === "photo_upload"),
        file,
      )
    event.target.value = ""
  }

  const watering = groups.find(
    (group) => group.taskType === "watering" && group.status !== "completed",
  )
  const photo = groups.find(
    (group) =>
      group.taskType === "photo_upload" && group.status !== "completed",
  )

  return (
    <SurfacePanel>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <PanelTitle
            icon={<Sprout aria-hidden="true" className="h-4 w-4" />}
            tone="moss"
          >
            {t("eyebrow")}
          </PanelTitle>
          <h2 className="mt-2 text-2xl font-extrabold">
            {t("dashboard.entryTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            {t("dashboard.entryBody")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
          <MetricTile
            label={t("dashboard.monthlyProgress")}
            tone="muted"
            value={`${summary.completedCompletions}/${summary.totalCompletions}`}
          />
          <MetricTile
            label={t("dashboard.pending")}
            tone="muted"
            value={summary.pendingCompletions}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState className="mt-5" title={t("empty")} />
      ) : null}
      {message ? (
        <p className="mt-4 text-sm font-semibold text-moss">{message}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="btn-secondary"
          disabled={!watering?.nextTaskId || busyId === watering?.id}
          onClick={() => void quickComplete(watering)}
          type="button"
        >
          <Droplets aria-hidden="true" className="h-4 w-4" />
          {busyId === watering?.id
            ? common("saving")
            : t("dashboard.quickWater")}
        </button>
        <label
          className={
            photo?.nextTaskId
              ? "btn-secondary cursor-pointer"
              : "btn-secondary cursor-not-allowed opacity-60"
          }
        >
          <Camera aria-hidden="true" className="h-4 w-4" />
          <input
            accept="image/*"
            className="sr-only"
            disabled={!photo?.nextTaskId || busyId === photo?.id}
            onChange={handlePhoto}
            type="file"
          />
          {busyId === photo?.id ? common("saving") : t("dashboard.quickPhoto")}
        </label>
        <Link className="btn-primary" href={`/${locale}/me/interactions`}>
          {t("dashboard.viewAll")}
        </Link>
      </div>
    </SurfacePanel>
  )
}
