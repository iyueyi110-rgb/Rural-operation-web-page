import type { Feedback } from "@zouma/contracts"

export type FeedbackCategory = Feedback["category"]
export type FeedbackSeverity = Feedback["severity"]
export type FeedbackStatus = Feedback["status"]

export interface FeedbackHandlingRecord {
  id: string
  status: FeedbackStatus
  note: string
  operator: string
  createdAt: string
}

export interface FeedbackRecord extends Feedback {
  id: string
  source: "web" | "admin"
  submittedAt: string
  updatedAt: string
  handlingRecords: FeedbackHandlingRecord[]
}

export interface CreateFeedbackInput {
  category: FeedbackCategory
  severity: FeedbackSeverity
  content: string
  rating: number
}

const categories: FeedbackCategory[] = ["content", "service", "facility", "payment", "other"]
const severities: FeedbackSeverity[] = ["low", "medium", "high", "urgent"]
const statuses: FeedbackStatus[] = ["submitted", "assigned", "processing", "resolved", "closed"]

const seedRecords: FeedbackRecord[] = [
  {
    id: "FB-20260612-001",
    category: "facility",
    severity: "medium",
    content: "游客中心到陶家湾停车点的指示牌还可以更明显，老人找路时需要工作人员二次说明。",
    rating: 4,
    status: "processing",
    source: "web",
    submittedAt: "2026-06-12T09:20:00.000+08:00",
    updatedAt: "2026-06-12T10:10:00.000+08:00",
    handlingRecords: [
      {
        id: "HR-001",
        status: "submitted",
        note: "前台反馈已入库。",
        operator: "系统",
        createdAt: "2026-06-12T09:20:00.000+08:00",
      },
      {
        id: "HR-002",
        status: "processing",
        note: "已转给现场运营核对导视位置。",
        operator: "运营值班",
        createdAt: "2026-06-12T10:10:00.000+08:00",
      },
    ],
  },
  {
    id: "FB-20260612-002",
    category: "service",
    severity: "low",
    content: "荔枝树认养讲解很清楚，希望后续能增加采摘活动提醒。",
    rating: 5,
    status: "submitted",
    source: "web",
    submittedAt: "2026-06-12T11:05:00.000+08:00",
    updatedAt: "2026-06-12T11:05:00.000+08:00",
    handlingRecords: [
      {
        id: "HR-003",
        status: "submitted",
        note: "前台反馈已入库。",
        operator: "系统",
        createdAt: "2026-06-12T11:05:00.000+08:00",
      },
    ],
  },
]

const globalStore = globalThis as typeof globalThis & {
  __zoumaFeedbackRecords?: FeedbackRecord[]
}

function getRecords() {
  if (!globalStore.__zoumaFeedbackRecords) {
    globalStore.__zoumaFeedbackRecords = seedRecords.map((record) => ({
      ...record,
      handlingRecords: record.handlingRecords.map((item) => ({ ...item })),
    }))
  }

  return globalStore.__zoumaFeedbackRecords
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function sanitizeContent(content: string) {
  return content
    .replace(/1[3-9]\d{9}/g, (phone) => `${phone.slice(0, 3)}****${phone.slice(-4)}`)
    .replace(/\b\d{2,3}\.\d{4,},\s*\d{2,3}\.\d{4,}\b/g, "模糊位置")
    .trim()
}

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && categories.includes(value as FeedbackCategory)
}

export function isFeedbackSeverity(value: unknown): value is FeedbackSeverity {
  return typeof value === "string" && severities.includes(value as FeedbackSeverity)
}

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === "string" && statuses.includes(value as FeedbackStatus)
}

export function listFeedbackRecords() {
  return [...getRecords()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function createFeedbackRecord(input: CreateFeedbackInput) {
  const now = new Date().toISOString()
  const record: FeedbackRecord = {
    id: createId("FB"),
    category: input.category,
    severity: input.severity,
    content: sanitizeContent(input.content),
    rating: input.rating,
    status: "submitted",
    source: "web",
    submittedAt: now,
    updatedAt: now,
    handlingRecords: [
      {
        id: createId("HR"),
        status: "submitted",
        note: "前台反馈已入库。",
        operator: "系统",
        createdAt: now,
      },
    ],
  }

  getRecords().unshift(record)
  return record
}

export function updateFeedbackStatus(id: string, status: FeedbackStatus, note: string) {
  const records = getRecords()
  const record = records.find((item) => item.id === id)

  if (!record) {
    return null
  }

  const now = new Date().toISOString()
  record.status = status
  record.updatedAt = now
  record.handlingRecords.unshift({
    id: createId("HR"),
    status,
    note: sanitizeContent(note || "后台更新了工单状态。"),
    operator: "运营后台",
    createdAt: now,
  })

  return record
}
