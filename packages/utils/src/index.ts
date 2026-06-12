export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export { ModelProviderAdapter } from "./model-provider-adapter"
export type { ModelProviderAdapterOptions, ModelProviderAdapterResult } from "./model-provider-adapter"
