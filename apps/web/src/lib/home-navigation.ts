import type { Locale } from "@web/i18n/routing"

export function buildExploreHref(locale: Locale, section?: string) {
  return `/${locale}/explore${section ? `#${section}` : ""}`
}

export function buildAdoptionHref(locale: Locale) {
  return `/${locale}/trees`
}
