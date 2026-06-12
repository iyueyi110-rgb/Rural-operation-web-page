import type { Scene } from "@zouma/contracts"

export const homeScenes: Scene[] = [
  {
    slug: "ancient-road",
    realm: "ancient_road",
    titleKey: "realms.ancientRoad.title",
    summaryKey: "realms.ancientRoad.summary",
    coverAsset: "/images/home/ancient-road-user.webp",
    updatedAt: "2026-06-12",
    cta: {
      labelKey: "realms.ancientRoad.cta",
      href: "#realms",
    },
  },
  {
    slug: "lychee-field",
    realm: "lychee_field",
    titleKey: "realms.lycheeField.title",
    summaryKey: "realms.lycheeField.summary",
    coverAsset: "/images/home/lychee-field-user.webp",
    updatedAt: "2026-06-12",
    cta: {
      labelKey: "realms.lycheeField.cta",
      href: "#adoption-preview",
    },
  },
  {
    slug: "resilience-valley",
    realm: "resilience_valley",
    titleKey: "realms.resilienceValley.title",
    summaryKey: "realms.resilienceValley.summary",
    coverAsset: "/images/home/resilience-valley.webp",
    updatedAt: "2026-06-12",
    cta: {
      labelKey: "realms.resilienceValley.cta",
      href: "#weather",
    },
  },
  {
    slug: "ridge-dwelling",
    realm: "ridge_dwelling",
    titleKey: "realms.ridgeDwelling.title",
    summaryKey: "realms.ridgeDwelling.summary",
    coverAsset: "/images/home/ridge-courtyard.webp",
    updatedAt: "2026-06-12",
    cta: {
      labelKey: "realms.ridgeDwelling.cta",
      href: "#booking-preview",
    },
  },
]

export const featuredPlayCards = [
  {
    icon: "Map",
    titleKey: "playCards.route.title",
    bodyKey: "playCards.route.body",
  },
  {
    icon: "CalendarDays",
    titleKey: "playCards.courtyard.title",
    bodyKey: "playCards.courtyard.body",
  },
  {
    icon: "Sprout",
    titleKey: "playCards.tree.title",
    bodyKey: "playCards.tree.body",
  },
] as const

export const previewStats = [
  {
    valueKey: "stats.area.value",
    labelKey: "stats.area.label",
  },
  {
    valueKey: "stats.forest.value",
    labelKey: "stats.forest.label",
  },
  {
    valueKey: "stats.fields.value",
    labelKey: "stats.fields.label",
  },
] as const
