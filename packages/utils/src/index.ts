export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export { ModelProviderAdapter } from "./model-provider-adapter"
export type { ModelProviderAdapterOptions, ModelProviderAdapterResult } from "./model-provider-adapter"
export { computeScores } from "./scoring-engine"
export type { ScoringInput, ScoringOutput } from "./scoring-engine"
export { computeControlSuggestions } from "./control-engine"
export type { ControlSensorInput, ControlSuggestion } from "./control-engine"
