import type { Feedback } from "@zouma/contracts"

export type FeedbackCategory = Feedback["category"]
export type FeedbackSeverity = Feedback["severity"]
export type FeedbackStatus = Feedback["status"]

export interface CreateFeedbackInput {
  category: FeedbackCategory
  severity: FeedbackSeverity
  content: string
  rating: number
}

const categories: FeedbackCategory[] = ["content", "service", "facility", "payment", "other"]
const severities: FeedbackSeverity[] = ["low", "medium", "high", "urgent"]
const statuses: FeedbackStatus[] = ["submitted", "assigned", "processing", "resolved", "closed"]

export function sanitizeContent(content: string) {
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
