import type {
  KnowledgeAnswerData,
  KnowledgeAnswerStatus,
  KnowledgeCitation,
} from "@zouma/contracts"

export type KnowledgeRole = "operator" | "villager"
export type DocumentStatus = "active" | "superseded" | "draft"

export interface KnowledgeDocumentMetadata {
  documentId: string
  title: string
  version: string
  effectiveDate: string
  status: DocumentStatus
  allowedRoles: KnowledgeRole[]
  owner: string
  reviewedAt: string
}

export interface KnowledgeChunk {
  id: string
  documentId: string
  title: string
  version: string
  section: string
  text: string
  tokens: string[]
  allowedRoles: KnowledgeRole[]
  status: DocumentStatus
}

export interface KnowledgeIndex {
  version: string
  generatedAt: string
  chunks: KnowledgeChunk[]
}

export interface RankedChunk extends KnowledgeChunk {
  score: number
}

export function isKnowledgeStatus(
  value: unknown,
): value is KnowledgeAnswerStatus {
  return [
    "answered",
    "knowledge_not_published",
    "insufficient_evidence",
    "permission_denied",
    "conflicting_rules",
    "specific_case_requires_operator",
    "prohibited_action",
  ].includes(String(value))
}

export function isCitation(value: unknown): value is KnowledgeCitation {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return ["documentId", "title", "version", "section", "quote"].every(
    (key) => typeof item[key] === "string",
  )
}

export function isKnowledgeAnswer(
  value: unknown,
): value is KnowledgeAnswerData {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    typeof item.answer === "string" &&
    isKnowledgeStatus(item.status) &&
    Array.isArray(item.citations) &&
    item.citations.every(isCitation) &&
    Array.isArray(item.allowedRoles) &&
    typeof item.requiresHuman === "boolean"
  )
}
