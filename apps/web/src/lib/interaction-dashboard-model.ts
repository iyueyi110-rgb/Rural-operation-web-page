import {
  getInteractionPoints,
  getInteractionRepeatCount,
  isInteractionTaskType,
  type InteractionTaskType,
} from "./interaction-tasks"

export interface InteractionTaskModel {
  id: string
  adoptionId: string
  treeId: string
  taskType: string
  title: string
  description?: string
  status: string
  periodKey?: string
  maxCompletions?: number
  completionCount?: number
  pointsPerCompletion?: number
  totalPointsEarned?: number
  seasonEventId?: string
  completedAt?: string
  imageUrl?: string
  note?: string
  points: number
  createdAt: string
  updatedAt: string
}

export interface InteractionTaskGroup {
  id: string
  taskIds: string[]
  adoptionId: string
  treeId: string
  taskType: InteractionTaskType
  title: string
  description?: string
  status: "pending" | "completed" | "expired"
  periodKey?: string
  maxCompletions: number
  completionCount: number
  pointsPerCompletion: number
  totalPointsEarned: number
  seasonEventId?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  nextTaskId?: string
  pendingTaskIds: string[]
  isLegacyGroup: boolean
}

export interface InteractionProgressSummary {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalCompletions: number
  completedCompletions: number
  pendingCompletions: number
  totalPointsEarned: number
  completionRate: number
  tasksByType: Record<InteractionTaskType, { total: number; completed: number }>
}

const taskTypeOrder: InteractionTaskType[] = [
  "watering",
  "fertilizing",
  "photo_upload",
  "diary",
  "share",
]

export function buildInteractionTaskGroups(
  tasks: InteractionTaskModel[],
): InteractionTaskGroup[] {
  const buckets = new Map<string, InteractionTaskModel[]>()

  tasks.forEach((task) => {
    if (!isInteractionTaskType(task.taskType)) return
    const key = `${task.periodKey ?? "legacy"}:${task.taskType}`
    buckets.set(key, [...(buckets.get(key) ?? []), task])
  })

  return Array.from(buckets.values())
    .map((bucket) => buildGroup(bucket))
    .sort(
      (a, b) =>
        taskTypeOrder.indexOf(a.taskType) - taskTypeOrder.indexOf(b.taskType),
    )
}

export function summarizeInteractionProgress(
  groups: InteractionTaskGroup[],
): InteractionProgressSummary {
  const summary: InteractionProgressSummary = {
    totalTasks: groups.length,
    completedTasks: groups.filter((group) => group.status === "completed")
      .length,
    pendingTasks: groups.filter((group) => group.status === "pending").length,
    totalCompletions: 0,
    completedCompletions: 0,
    pendingCompletions: 0,
    totalPointsEarned: 0,
    completionRate: 0,
    tasksByType: {
      watering: { total: 0, completed: 0 },
      fertilizing: { total: 0, completed: 0 },
      photo_upload: { total: 0, completed: 0 },
      diary: { total: 0, completed: 0 },
      share: { total: 0, completed: 0 },
    },
  }

  groups.forEach((group) => {
    summary.totalCompletions += group.maxCompletions
    summary.completedCompletions += group.completionCount
    summary.totalPointsEarned += group.totalPointsEarned
    summary.tasksByType[group.taskType].total += group.maxCompletions
    summary.tasksByType[group.taskType].completed += group.completionCount
  })
  summary.pendingCompletions = Math.max(
    0,
    summary.totalCompletions - summary.completedCompletions,
  )
  summary.completionRate =
    summary.totalCompletions > 0
      ? Math.round(
          (summary.completedCompletions / summary.totalCompletions) * 100,
        )
      : 0

  return summary
}

function buildGroup(bucket: InteractionTaskModel[]): InteractionTaskGroup {
  const sorted = [...bucket].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  const first = sorted[0]
  const taskType = isInteractionTaskType(first.taskType)
    ? first.taskType
    : "watering"
  const usesRepeatFields =
    typeof first.maxCompletions === "number" ||
    typeof first.completionCount === "number" ||
    typeof first.pointsPerCompletion === "number"
  const maxCompletions = usesRepeatFields
    ? normalizePositiveInt(
        first.maxCompletions,
        getInteractionRepeatCount(taskType),
      )
    : sorted.length
  const legacyCompleted = sorted.filter(
    (task) => task.status === "completed",
  ).length
  const completionCount = clampInt(
    usesRepeatFields
      ? normalizePositiveInt(first.completionCount, legacyCompleted)
      : legacyCompleted,
    0,
    maxCompletions,
  )
  const pointsPerCompletion = normalizePositiveInt(
    first.pointsPerCompletion,
    getInteractionPoints(taskType),
  )
  const totalPointsEarned =
    typeof first.totalPointsEarned === "number"
      ? first.totalPointsEarned
      : sorted.reduce(
          (sum, task) => sum + (task.status === "completed" ? task.points : 0),
          0,
        )
  const pendingTasks = sorted.filter((task) => task.status === "pending")
  const latest = [...sorted].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0]

  return {
    id: first.id,
    taskIds: sorted.map((task) => task.id),
    adoptionId: first.adoptionId,
    treeId: first.treeId,
    taskType,
    title: buildGroupTitle(first.title, taskType, usesRepeatFields),
    description: first.description,
    status: resolveGroupStatus(sorted, completionCount, maxCompletions),
    periodKey: first.periodKey,
    maxCompletions,
    completionCount,
    pointsPerCompletion,
    totalPointsEarned,
    seasonEventId: first.seasonEventId,
    completedAt: latest.completedAt,
    createdAt: first.createdAt,
    updatedAt: latest.updatedAt,
    nextTaskId: pendingTasks[0]?.id,
    pendingTaskIds: pendingTasks.map((task) => task.id),
    isLegacyGroup: !usesRepeatFields && sorted.length > 1,
  }
}

function buildGroupTitle(
  title: string,
  taskType: InteractionTaskType,
  usesRepeatFields: boolean,
) {
  if (usesRepeatFields || taskType !== "watering") return title
  return "本月浇水"
}

function resolveGroupStatus(
  tasks: InteractionTaskModel[],
  completionCount: number,
  maxCompletions: number,
): "pending" | "completed" | "expired" {
  if (completionCount >= maxCompletions) return "completed"
  if (tasks.every((task) => task.status === "expired")) return "expired"
  return "pending"
}

function normalizePositiveInt(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(value)))
}
