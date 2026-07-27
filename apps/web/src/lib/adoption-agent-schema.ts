import type { AdoptionAgentSuggestion } from "@zouma/contracts"

export function normalizeAdoptionSuggestion(
  value: unknown,
  runId: string,
): AdoptionAgentSuggestion {
  if (!value || typeof value !== "object")
    throw new Error("INVALID_AGENT_OUTPUT")
  const item = value as Record<string, unknown>
  const riskTypes = [
    "deadline",
    "unclaimed",
    "evidence",
    "weather",
    "repeated_exception",
  ] as const
  const actions = [
    "remind",
    "reassign",
    "extend",
    "manual_review",
    "no_action",
  ] as const
  if (
    !["low", "medium", "high"].includes(String(item.risk_level)) ||
    typeof item.adoption_id !== "string" ||
    typeof item.task_id !== "string" ||
    !riskTypes.includes(item.risk_type as (typeof riskTypes)[number]) ||
    !Array.isArray(item.evidence_refs) ||
    !item.evidence_refs.every((ref) => typeof ref === "string") ||
    typeof item.summary !== "string" ||
    !actions.includes(item.recommended_action as (typeof actions)[number]) ||
    typeof item.reason !== "string" ||
    typeof item.confidence !== "number" ||
    item.confidence < 0 ||
    item.confidence > 1 ||
    item.requires_human_approval !== true
  )
    throw new Error("INVALID_AGENT_OUTPUT")
  return {
    runId,
    riskLevel: item.risk_level as AdoptionAgentSuggestion["riskLevel"],
    adoptionId: item.adoption_id,
    taskId: item.task_id,
    riskType: item.risk_type as AdoptionAgentSuggestion["riskType"],
    evidenceRefs: item.evidence_refs,
    summary: item.summary,
    recommendedAction:
      item.recommended_action as AdoptionAgentSuggestion["recommendedAction"],
    reason: item.reason,
    confidence: item.confidence,
    requiresHumanApproval: true,
  }
}

export function isAdoptionRecommendationType(type: string) {
  return type.startsWith("adoption_")
}

export function shouldExecuteRecommendationActions(type: string) {
  return !isAdoptionRecommendationType(type)
}
