export type FeatureFlagName =
  | "ADOPTION_V2_ENABLED"
  | "KNOWLEDGE_ASSISTANT_ENABLED"
  | "ADOPTION_AGENT_SHADOW_ENABLED"

export function isFeatureEnabled(name: FeatureFlagName) {
  const value = process.env[name]?.trim().toLowerCase()
  if (value === "true" || value === "1") return true
  if (value === "false" || value === "0") return false
  return process.env.NODE_ENV !== "production"
}
