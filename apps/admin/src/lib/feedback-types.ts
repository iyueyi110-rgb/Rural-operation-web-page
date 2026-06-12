import type { Feedback } from "@zouma/contracts"

export interface FeedbackHandlingRecord {
  id: string
  status: Feedback["status"]
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
