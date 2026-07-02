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

const demoAdoptionId = "demo-interaction-adoption"
const demoTreeId = "demo-tree-lz026"
const demoPoints = { totalPoints: 85, availablePoints: 65, redeemedPoints: 20 }

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
  const [isDemoMode, setIsDemoMode] = useState(false)

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
        const loadedTasks = Array.isArray(tasksPayload.data)
          ? tasksPayload.data
          : []
        const loadedPoints = pointsPayload.data ?? emptyPoints
        const loadedTransactions = Array.isArray(pointsPayload.transactions)
          ? pointsPayload.transactions
          : []
        const loadedRedemptionOptions = Array.isArray(optionsPayload.data)
          ? optionsPayload.data
          : []
        const loadedSeasonEvents = Array.isArray(seasonPayload.data)
          ? seasonPayload.data
          : []
        const shouldShowDemo =
          loadedTasks.length === 0 &&
          loadedTransactions.length === 0 &&
          loadedRedemptionOptions.length === 0 &&
          loadedSeasonEvents.length === 0 &&
          loadedPoints.totalPoints === 0 &&
          loadedPoints.availablePoints === 0

        if (shouldShowDemo) {
          setIsDemoMode(true)
          setTasks(createDemoTasks(adoption))
          setPoints(demoPoints)
          setTransactions(createDemoTransactions())
          setRedemptionOptions(createDemoRedemptionOptions())
          setSeasonEvents(createDemoSeasonEvents())
          setMessage(t("states.demoFallback"))
        } else {
          setIsDemoMode(false)
          setTasks(loadedTasks)
          setPoints(loadedPoints)
          setTransactions(loadedTransactions)
          setRedemptionOptions(loadedRedemptionOptions)
          setSeasonEvents(loadedSeasonEvents)
          setMessage("")
        }
      } catch (error) {
        console.error("Interaction dashboard load failed:", error)
        setIsDemoMode(true)
        setTasks(createDemoTasks(adoption))
        setPoints(demoPoints)
        setTransactions(createDemoTransactions())
        setRedemptionOptions(createDemoRedemptionOptions())
        setSeasonEvents(createDemoSeasonEvents())
        setMessage(t("states.demoFallback"))
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
    if (isDemoMode) {
      const completedAt = new Date().toISOString()
      setBusyId(group.id)
      window.setTimeout(() => {
        setTasks((current) =>
          current.map((task) =>
            task.periodKey === group.periodKey && task.taskType === group.taskType
              ? {
                  ...task,
                  status: task.id === group.nextTaskId ? "completed" : task.status,
                  completedAt: task.id === group.nextTaskId ? completedAt : task.completedAt,
                  completionCount: Math.min(
                    group.maxCompletions,
                    group.completionCount + 1,
                  ),
                  totalPointsEarned:
                    group.totalPointsEarned + group.pointsPerCompletion,
                  note: task.id === group.nextTaskId ? notes[group.id] || task.note : task.note,
                  updatedAt: completedAt,
                }
              : task,
          ),
        )
        setPoints((current) => ({
          totalPoints: current.totalPoints + group.pointsPerCompletion,
          availablePoints: current.availablePoints + group.pointsPerCompletion,
          redeemedPoints: current.redeemedPoints,
        }))
        setTransactions((current) => [
          {
            id: `demo-earn-${group.nextTaskId}`,
            amount: group.pointsPerCompletion,
            source: group.taskType,
            note: `${group.title} · 演示入账`,
            createdAt: completedAt,
          },
          ...current,
        ])
        setMessage(t("states.demoCompleted"))
        setBusyId("")
      }, 260)
      return
    }
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
    if (isDemoMode) {
      if (points.availablePoints < option.pointsCost) {
        setMessage(t("redemption.insufficient"))
        return
      }
      const redeemedAt = new Date().toISOString()
      setRedeemingId(option.id)
      window.setTimeout(() => {
        setPoints((current) => ({
          totalPoints: current.totalPoints,
          availablePoints: current.availablePoints - option.pointsCost,
          redeemedPoints: current.redeemedPoints + option.pointsCost,
        }))
        setRedemptionOptions((current) =>
          current.map((item) =>
            item.id === option.id
              ? { ...item, redeemedCount: item.redeemedCount + 1 }
              : item,
          ),
        )
        setTransactions((current) => [
          {
            id: `demo-redeem-${option.id}-${Date.now()}`,
            amount: -option.pointsCost,
            source: "redeem",
            note: `${option.title} · 演示兑换`,
            createdAt: redeemedAt,
          },
          ...current,
        ])
        setMessage(t("redemption.success"))
        setRedeemingId("")
      }, 260)
      return
    }
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
      {isDemoMode ? (
        <InlineNotice tone="warning">{t("states.demoNotice")}</InlineNotice>
      ) : null}

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

function createDemoTasks(adoption: AdoptionRecord): InteractionTaskModel[] {
  const now = Date.now()
  const adoptionId = adoption.id || demoAdoptionId
  const treeId = adoption.treeId || demoTreeId
  const periodKey = "demo-2026-07"

  return [
    createDemoTask({
      id: "demo-watering-1",
      adoptionId,
      treeId,
      taskType: "watering",
      title: "本月浇水",
      description: "完成一次清晨补水，记录土壤湿度和叶片状态。",
      maxCompletions: 4,
      completionCount: 2,
      pointsPerCompletion: 10,
      totalPointsEarned: 20,
      status: "completed",
      periodKey,
      createdAt: new Date(now - 9 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    }),
    createDemoTask({
      id: "demo-watering-2",
      adoptionId,
      treeId,
      taskType: "watering",
      title: "本月浇水",
      description: "完成一次清晨补水，记录土壤湿度和叶片状态。",
      maxCompletions: 4,
      completionCount: 2,
      pointsPerCompletion: 10,
      totalPointsEarned: 20,
      status: "pending",
      periodKey,
      createdAt: new Date(now - 8 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 8 * 86_400_000).toISOString(),
    }),
    createDemoTask({
      id: "demo-photo-1",
      adoptionId,
      treeId,
      taskType: "photo_upload",
      title: "上传本周成长照片",
      description: "拍摄树冠、新梢或挂果细节，形成一条可回看的成长记录。",
      maxCompletions: 1,
      completionCount: 0,
      pointsPerCompletion: 15,
      totalPointsEarned: 0,
      status: "pending",
      periodKey,
      createdAt: new Date(now - 6 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 6 * 86_400_000).toISOString(),
    }),
    createDemoTask({
      id: "demo-diary-1",
      adoptionId,
      treeId,
      taskType: "diary",
      title: "写一条养护观察",
      description: "记录天气、叶片、果实或现场体验，作为返访关系的内容沉淀。",
      maxCompletions: 1,
      completionCount: 0,
      pointsPerCompletion: 20,
      totalPointsEarned: 0,
      status: "pending",
      periodKey,
      createdAt: new Date(now - 5 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 5 * 86_400_000).toISOString(),
    }),
  ]
}

function createDemoTask(
  task: Omit<InteractionTaskModel, "points" | "seasonEventId">,
): InteractionTaskModel {
  return {
    ...task,
    points: task.status === "completed" ? task.pointsPerCompletion ?? 0 : 0,
  }
}

function createDemoTransactions(): TimelineTransaction[] {
  const now = Date.now()
  return [
    {
      id: "demo-points-water",
      amount: 10,
      source: "watering",
      note: "完成清晨浇水 · 演示入账",
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
    },
    {
      id: "demo-points-share",
      amount: 15,
      source: "share",
      note: "分享认养树成长 · 演示入账",
      createdAt: new Date(now - 4 * 86_400_000).toISOString(),
    },
    {
      id: "demo-points-redeem",
      amount: -20,
      source: "redeem",
      note: "兑换荔枝明信片 · 演示扣减",
      createdAt: new Date(now - 7 * 86_400_000).toISOString(),
    },
  ]
}

function createDemoRedemptionOptions(): RedemptionOptionView[] {
  return [
    {
      id: "demo-postcard",
      title: "走马村荔枝明信片",
      description: "返访时领取一套认养树成长明信片。",
      pointsCost: 30,
      type: "souvenir",
      stock: 20,
      redeemedCount: 3,
      status: "active",
    },
    {
      id: "demo-orchard-tea",
      title: "果园茶歇抵扣券",
      description: "在村内活动节点抵扣一次茶歇体验。",
      pointsCost: 80,
      type: "coupon",
      stock: 10,
      redeemedCount: 2,
      status: "active",
    },
  ]
}

function createDemoSeasonEvents(): SeasonEventView[] {
  return [
    {
      id: "demo-summer-care",
      solarTerm: "小暑",
      title: "小暑护果周",
      description: "完成浇水、拍照和观察记录，可获得额外互动积分。",
      bonusPoints: 20,
      endDate: new Date(Date.now() + 9 * 86_400_000).toISOString(),
    },
  ]
}
