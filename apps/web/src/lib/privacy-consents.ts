export const CONSENT_TYPES = [
  "privacy_policy",
  "data_collection",
  "ai_processing",
  "location",
] as const

export type ConsentType = (typeof CONSENT_TYPES)[number]

export function normalizeConsentType(value: unknown): ConsentType | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return CONSENT_TYPES.includes(normalized as ConsentType)
    ? (normalized as ConsentType)
    : null
}
