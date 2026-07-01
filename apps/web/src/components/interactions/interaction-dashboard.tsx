"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Sprout, UserRound } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  FieldLabel,
  InlineNotice,
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

import { InteractionTaskList } from "./task-list"
import { InteractionTimeline, type TimelineTransaction } from "./timeline"
import { PointsSummary } from "./points-summary"
import { RedemptionPanel, type RedemptionOptionView } from "./redemption-panel"
import { SeasonBanner, type SeasonEventView } from "./season-banner"

interface AdoptionRecord {
  id: string
  treeId: string
  treeCode?: string
  plan: string
  status: string
  createdAt: string
}

interface PointsPayload {
  data?: {
    adoptionId: string
    totalPoints: number
    availablePoints: number
    redeemedPoints: number
  }
  transactions?: TimelineTransaction[]
}

const emptyPoints = { totalPoints: 0, availablePoints: 0, redeemedPoints: 0 }

export function InteractionDashboard() {
  const t = useTranslations("villagerSystem.interactions")
  const common = useTranslations("villagerSystem.common")
  const locale = useLocale()
  const [phoneInput, setPhoneInput] = useState("")
  const [phone, setPhone] = useState("")
  const [adoptions, setAdoptions] = useState<AdoptionRecord[]>([])
  const [selectedAdoptionId, setSelectedAdoptionId] = useState("")
  const [tasks, setTasks] = useState<InteractionTaskModel[]>([])
  const [points, setPoints] = useState(emptyPoints)
  const [transactions, setTransactions] = useState<TimelineTransaction[]>([])
  const [seasonEvents, setSeasonEvents] = useState<SeasonEventView[]>([])
  const [redemptionOptions, setRedemptionOptions] = useState<
    RedemptionOptionView[]
  >([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState("")
  const [redeemingId, setRedeemingId] = useState("")
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [message, setMessage] = useState("")

  const activeAdoptions = useMemo(
    () => adoptions.filter((adoption) => adoption.status === "active"),
    [adoptions],
  )
  const selectedAdoption =
    activeAdoptions.find((adoption) => adoption.id === selectedAdoptionId) ??
    activeAdoptions[0]
  const taskGroups = useMemo(() => buildInteractionTaskGroups(tasks), [tasks])
  const summary = useMemo(
    () => summarizeInteractionProgress(taskGroups),
    [taskGroups],
  )

  const loadDashboard = useCallback(
    async (adoption: AdoptionRecord, currentPhone: string) => {
      setIsLoadingDashboard(true)
      try {
        const query = `adoptionId=${encodeURIComponent(adoption.id)}&adopterPhone=${encodeURIComponent(currentPhone)}`
        const [tasksPayload, pointsPayload, optionsPayload, seasonPayload] =
          await Promise.all([
            fetch(`/api/v1/interactions?${query}`).then(
              readJson<{ data?: InteractionTaskModel[] }>,
            ),
            fetch(`/api/v1/points?${query}&include=transactions`).then(
              readJson<PointsPayload>,
            ),
            fetch("/api/v1/redeem/options").then(
              readJson<{ data?: RedemptionOptionView[] }>,
            ),
            fetch("/api/v1/interactions/seasonal").then(
              readJson<{ data?: SeasonEventView[] }>,
            ),
          ])
        setTasks(Array.isArray(tasksPayload.data) ? tasksPayload.data : [])
        setPoints(pointsPayload.data ?? emptyPoints)
        setTransactions(
          Array.isArray(pointsPayload.transactions)
            ? pointsPayload.transactions
            : [],
        )
        setRedemptionOptions(
          Array.isArray(optionsPayload.data) ? optionsPayload.data : [],
        )
        setSeasonEvents(
          Array.isArray(seasonPayload.data) ? seasonPayload.data : [],
        )
        setMessage("")
      } catch (error) {
        console.error("Interaction dashboard load failed:", error)
        setTasks([])
        setTransactions([])
        setMessage(t("states.loadFailed"))
      } finally {
        setIsLoadingDashboard(false)
      }
    },
    [t],
  )

  const loadAdoptions = useCallback(
    async (nextPhone: string) => {
      if (!nextPhone.trim()) return
      setIsLoadingIdentity(true)
      setMessage("")
      try {
        const payload = await fetch(
          `/api/v1/tree-adoptions?adopterPhone=${encodeURIComponent(nextPhone.trim())}`,
        ).then(readJson<{ data?: AdoptionRecord[] }>)
        const records = Array.isArray(payload.data) ? payload.data : []
        setPhone(nextPhone.trim())
        setPhoneInput(nextPhone.trim())
        setAdoptions(records)
        window.localStorage.setItem("tourist_phone", nextPhone.trim())
        const active = records.find((record) => record.status === "active")
        setSelectedAdoptionId(active?.id ?? "")
        setMessage(active ? "" : t("states.noActiveAdoption"))
      } catch (error) {
        console.error("Interaction adoption lookup failed:", error)
        setAdoptions([])
        setSelectedAdoptionId("")
        setMessage(t("states.lookupFailed"))
      } finally {
        setIsLoadingIdentity(false)
      }
    },
    [t],
  )

  useEffect(() => {
    const storedPhone =
      window.localStorage.getItem("tourist_phone")?.trim() ?? ""
    setPhoneInput(storedPhone)
    if (storedPhone) void loadAdoptions(storedPhone)
  }, [loadAdoptions])

  useEffect(() => {
    if (selectedAdoption && phone) void loadDashboard(selectedAdoption, phone)
  }, [loadDashboard, phone, selectedAdoption])

  async function completeTask(group: InteractionTaskGroup, file?: File) {
    if (!selectedAdoption || !phone || !group.nextTaskId) return
    setBusyId(group.id)
    try {
      let imageUrl: string | undefined
      if (file) {
        const form = new FormData()
        form.set("file", file)
        form.set("adoptionId", selectedAdoption.id)
        form.set("adopterPhone", phone)
        const upload = await fetch("/api/v1/interactions/upload", {
          method: "POST",
          body: form,
        })
        if (!upload.ok) throw new Error("upload failed")
        imageUrl = ((await upload.json()) as { data?: { url?: string } }).data
          ?.url
      }
      if (group.taskType === "share") {
        const shareText = t("shareText", {
          treeCode: selectedAdoption.treeCode ?? selectedAdoption.treeId,
        })
        if (navigator.share) {
          await navigator
            .share({ text: shareText })
            .catch(() => navigator.clipboard?.writeText(shareText))
        } else {
          await navigator.clipboard?.writeText(shareText)
        }
      }
      const response = await fetch("/api/v1/interactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: group.nextTaskId,
          adopterPhone: phone,
          status: "completed",
          note: notes[group.id],
          imageUrl,
        }),
      })
      if (!response.ok) throw new Error("completion failed")
      setMessage(t("states.completed"))
      await loadDashboard(selectedAdoption, phone)
    } catch (error) {
      console.error("Interaction task completion failed:", error)
      setMessage(
        group.taskType === "photo_upload"
          ? t("states.uploadFailed")
          : t("states.completeFailed"),
      )
    } finally {
      setBusyId("")
    }
  }

  async function redeem(option: RedemptionOptionView) {
    if (!selectedAdoption || !phone) return
    setRedeemingId(option.id)
    try {
      const response = await fetch("/api/v1/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adoptionId: selectedAdoption.id,
          adopterPhone: phone,
          optionId: option.id,
        }),
      })
      if (!response.ok) throw new Error("redeem failed")
      setMessage(t("redemption.success"))
      await loadDashboard(selectedAdoption, phone)
    } catch (error) {
      console.error("Redemption failed:", error)
      setMessage(t("redemption.insufficient"))
    } finally {
      setRedeemingId("")
    }
  }

  if (!phone || activeAdoptions.length === 0) {
    return (
      <SurfacePanel>
        <PanelTitle
          icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
          tone="lychee"
        >
          {t("identity.title")}
        </PanelTitle>
        <p className="mt-3 text-sm leading-7 text-ink/64">
          {t("identity.body")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <FieldLabel label={t("identity.phone")}>
            <input
              className="input-control"
              inputMode="tel"
              onChange={(event) => setPhoneInput(event.target.value)}
              value={phoneInput}
            />
          </FieldLabel>
          <button
            className="btn-primary self-end"
            disabled={isLoadingIdentity || !phoneInput.trim()}
            onClick={() => void loadAdoptions(phoneInput)}
            type="button"
          >
            {isLoadingIdentity ? common("loading") : t("identity.lookup")}
          </button>
        </div>
        {message ? (
          <InlineNotice className="mt-4" tone="neutral">
            {message}
          </InlineNotice>
        ) : null}
        <Link className="btn-secondary mt-5" href={`/${locale}/trees`}>
          {t("identity.adoptCta")}
        </Link>
      </SurfacePanel>
    )
  }

  return (
    <div className="grid gap-5">
      <SurfacePanel tone="success">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <PanelTitle
              icon={<Sprout aria-hidden="true" className="h-4 w-4" />}
              tone="moss"
            >
              {t("dashboard.currentAdoption")}
            </PanelTitle>
            <h2 className="mt-2 break-words text-2xl font-extrabold">
              {selectedAdoption.treeCode ?? selectedAdoption.treeId}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink/54">{phone}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile
              label={t("dashboard.totalPoints")}
              tone="muted"
              value={points.availablePoints}
            />
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
        {activeAdoptions.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeAdoptions.map((adoption) => (
              <button
                className={
                  adoption.id === selectedAdoption.id
                    ? "btn-primary btn-sm"
                    : "btn-secondary btn-sm"
                }
                key={adoption.id}
                onClick={() => setSelectedAdoptionId(adoption.id)}
                type="button"
              >
                {adoption.treeCode ?? adoption.treeId}
              </button>
            ))}
          </div>
        ) : null}
      </SurfacePanel>

      {message ? <InlineNotice tone="neutral">{message}</InlineNotice> : null}

      {isLoadingDashboard ? (
        <SurfacePanel>
          <div className="h-6 w-40 rounded-full bg-rice" />
          <div className="mt-5 grid gap-3">
            <div className="h-24 rounded-xl bg-rice" />
            <div className="h-24 rounded-xl bg-rice" />
          </div>
        </SurfacePanel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
          <div className="grid gap-5">
            <SeasonBanner
              bonusLabel={(pointsValue) =>
                t("season.bonusPoints", { points: pointsValue })
              }
              endsLabel={(days) => t("season.endsIn", { days })}
              event={seasonEvents[0]}
              tagLabel={t("season.eventTag")}
            />
            <InteractionTaskList
              actionFor={(group) => t(`actions.${group.taskType}`)}
              busyId={busyId}
              completedLabel={t("states.done")}
              emptyTitle={t("empty")}
              groups={taskGroups}
              noteLabel={t("notePlaceholder")}
              notes={notes}
              onComplete={completeTask}
              onNoteChange={(groupId, value) =>
                setNotes((current) => ({ ...current, [groupId]: value }))
              }
              savingLabel={common("saving")}
              title={t("dashboard.tasksTitle")}
            />
            <InteractionTimeline
              emptyTitle={t("timeline.empty")}
              title={t("timeline.title")}
              transactions={transactions}
            />
          </div>
          <aside className="grid gap-5">
            <PointsSummary
              availablePointsLabel={t("dashboard.availablePoints")}
              monthlyProgressLabel={t("dashboard.monthlyProgress")}
              points={points}
              summary={summary}
              title={t("dashboard.pointsTitle")}
              totalPointsLabel={t("dashboard.totalEarned")}
            />
            <RedemptionPanel
              availablePoints={points.availablePoints}
              busyId={redeemingId}
              emptyTitle={t("redemption.empty")}
              insufficientLabel={t("redemption.insufficient")}
              onRedeem={redeem}
              options={redemptionOptions}
              redeemLabel={t("redemption.redeem")}
              title={t("redemption.title")}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return (await response.json()) as T
}
