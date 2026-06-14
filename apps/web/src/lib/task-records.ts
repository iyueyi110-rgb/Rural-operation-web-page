import type { TaskData, TaskStatus, TaskType, VillagerTaskSummary } from "@zouma/contracts"

export const taskTypes = ["farming", "guiding", "logistics", "maintenance", "service"] as const
export const taskStatuses = ["pending", "accepted", "in_progress", "completed", "cancelled"] as const

const taskTransitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && taskTypes.includes(value as TaskType)
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatuses.includes(value as TaskStatus)
}

export function canMoveTaskStatus(current: string, next: string) {
  if (!isTaskStatus(current) || !isTaskStatus(next)) return false
  return current === next || taskTransitions[current].includes(next)
}

export function summarizeTasks(tasks: Array<{ status: string; earnings: number }>): VillagerTaskSummary {
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    totalEarnings: tasks
      .filter((task) => task.status === "completed")
      .reduce((sum, task) => sum + task.earnings, 0),
  }
}

export function mapTask(task: {
  id: string
  title: string
  description: string | null
  taskType: string
  status: string
  villagerId: string | null
  nodeId: string | null
  scheduledDate: string | null
  earnings: number
  createdAt: Date
  updatedAt: Date
  villager?: { id: string; name: string } | null
  node?: { id: string; slug: string; nameKey: string } | null
}): TaskData & {
  villager?: { id: string; name: string } | null
  node?: { id: string; slug: string; nameKey: string } | null
} {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    taskType: task.taskType as TaskType,
    status: task.status as TaskStatus,
    villagerId: task.villagerId ?? undefined,
    nodeId: task.nodeId ?? undefined,
    scheduledDate: task.scheduledDate ?? undefined,
    earnings: task.earnings,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    villager: task.villager,
    node: task.node,
  }
}
