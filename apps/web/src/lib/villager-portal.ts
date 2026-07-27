export interface VillagerSummary {
  id: string
  name: string
  skills: string[]
  nodeId?: string
  node?: { id: string; slug: string; nameKey: string } | null
  status: string
  taskSummary: TaskSummary
  monthlyTaskSummary: TaskSummary
}

export interface TaskSummary {
  totalTasks: number
  completedTasks: number
  totalEarnings: number
}

export interface VillagerTask {
  id: string
  title: string
  description?: string
  taskType: string
  status: string
  villagerId?: string
  nodeId?: string
  scheduledDate?: string
  adoptionId?: string
  treeId?: string
  deadlineAt?: string
  version?: number
  earnings: number
  createdAt: string
  updatedAt: string
  node?: { id: string; slug: string; nameKey: string } | null
}

export interface AppNotification {
  id: string
  recipientType: string
  recipientId: string
  title: string
  body: string
  channel: string
  category: string
  refType?: string
  refId?: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}
