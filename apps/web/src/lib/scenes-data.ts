import type { SceneRealm } from "@zouma/contracts"

export interface SceneDetail {
  slug: string
  realm: SceneRealm
  coverAsset: string
  titleKey: string
  eyebrowKey: string
  summaryKey: string
  imageAltKey: string
  updatedAt: string
  tags: string[]
  metrics: Array<{
    valueKey: string
    labelKey: string
  }>
  blocks: Array<{
    titleKey: string
    bodyKey: string
  }>
  ctas: Array<{
    labelKey: string
    href: string
    tone: "primary" | "secondary"
  }>
}

export const sceneDetails: SceneDetail[] = [
  {
    slug: "ancient-road",
    realm: "ancient_road",
    coverAsset: "/images/home/ancient-road-user.webp",
    titleKey: "ancientRoad.title",
    eyebrowKey: "ancientRoad.eyebrow",
    summaryKey: "ancientRoad.summary",
    imageAltKey: "ancientRoad.imageAlt",
    updatedAt: "2026-06-12",
    tags: ["ancientRoad.tags.heritage", "ancientRoad.tags.walk", "ancientRoad.tags.audio"],
    metrics: [
      { valueKey: "ancientRoad.metrics.length.value", labelKey: "ancientRoad.metrics.length.label" },
      { valueKey: "ancientRoad.metrics.nodes.value", labelKey: "ancientRoad.metrics.nodes.label" },
      { valueKey: "ancientRoad.metrics.audience.value", labelKey: "ancientRoad.metrics.audience.label" },
    ],
    blocks: [
      { titleKey: "ancientRoad.blocks.story.title", bodyKey: "ancientRoad.blocks.story.body" },
      { titleKey: "ancientRoad.blocks.experience.title", bodyKey: "ancientRoad.blocks.experience.body" },
      { titleKey: "ancientRoad.blocks.operation.title", bodyKey: "ancientRoad.blocks.operation.body" },
    ],
    ctas: [
      { labelKey: "ancientRoad.ctas.route", href: "/routes", tone: "primary" },
      { labelKey: "ancientRoad.ctas.booking", href: "/booking", tone: "secondary" },
    ],
  },
  {
    slug: "lychee-field",
    realm: "lychee_field",
    coverAsset: "/images/home/lychee-field-user.webp",
    titleKey: "lycheeField.title",
    eyebrowKey: "lycheeField.eyebrow",
    summaryKey: "lycheeField.summary",
    imageAltKey: "lycheeField.imageAlt",
    updatedAt: "2026-06-12",
    tags: ["lycheeField.tags.adoption", "lycheeField.tags.food", "lycheeField.tags.festival"],
    metrics: [
      { valueKey: "lycheeField.metrics.tree.value", labelKey: "lycheeField.metrics.tree.label" },
      { valueKey: "lycheeField.metrics.season.value", labelKey: "lycheeField.metrics.season.label" },
      { valueKey: "lycheeField.metrics.family.value", labelKey: "lycheeField.metrics.family.label" },
    ],
    blocks: [
      { titleKey: "lycheeField.blocks.tree.title", bodyKey: "lycheeField.blocks.tree.body" },
      { titleKey: "lycheeField.blocks.table.title", bodyKey: "lycheeField.blocks.table.body" },
      { titleKey: "lycheeField.blocks.trust.title", bodyKey: "lycheeField.blocks.trust.body" },
    ],
    ctas: [
      { labelKey: "lycheeField.ctas.adoption", href: "/trees", tone: "primary" },
      { labelKey: "lycheeField.ctas.route", href: "/routes", tone: "secondary" },
    ],
  },
  {
    slug: "resilience-valley",
    realm: "resilience_valley",
    coverAsset: "/images/home/resilience-valley.webp",
    titleKey: "resilienceValley.title",
    eyebrowKey: "resilienceValley.eyebrow",
    summaryKey: "resilienceValley.summary",
    imageAltKey: "resilienceValley.imageAlt",
    updatedAt: "2026-06-12",
    tags: ["resilienceValley.tags.water", "resilienceValley.tags.study", "resilienceValley.tags.weather"],
    metrics: [
      { valueKey: "resilienceValley.metrics.system.value", labelKey: "resilienceValley.metrics.system.label" },
      { valueKey: "resilienceValley.metrics.safety.value", labelKey: "resilienceValley.metrics.safety.label" },
      { valueKey: "resilienceValley.metrics.course.value", labelKey: "resilienceValley.metrics.course.label" },
    ],
    blocks: [
      { titleKey: "resilienceValley.blocks.water.title", bodyKey: "resilienceValley.blocks.water.body" },
      { titleKey: "resilienceValley.blocks.learning.title", bodyKey: "resilienceValley.blocks.learning.body" },
      { titleKey: "resilienceValley.blocks.weather.title", bodyKey: "resilienceValley.blocks.weather.body" },
    ],
    ctas: [
      { labelKey: "resilienceValley.ctas.route", href: "/routes", tone: "primary" },
      { labelKey: "resilienceValley.ctas.feedback", href: "/feedback", tone: "secondary" },
    ],
  },
  {
    slug: "ridge-dwelling",
    realm: "ridge_dwelling",
    coverAsset: "/images/home/ridge-courtyard.webp",
    titleKey: "ridgeDwelling.title",
    eyebrowKey: "ridgeDwelling.eyebrow",
    summaryKey: "ridgeDwelling.summary",
    imageAltKey: "ridgeDwelling.imageAlt",
    updatedAt: "2026-06-12",
    tags: ["ridgeDwelling.tags.stay", "ridgeDwelling.tags.lowCarbon", "ridgeDwelling.tags.shared"],
    metrics: [
      { valueKey: "ridgeDwelling.metrics.courtyard.value", labelKey: "ridgeDwelling.metrics.courtyard.label" },
      { valueKey: "ridgeDwelling.metrics.stay.value", labelKey: "ridgeDwelling.metrics.stay.label" },
      { valueKey: "ridgeDwelling.metrics.community.value", labelKey: "ridgeDwelling.metrics.community.label" },
    ],
    blocks: [
      { titleKey: "ridgeDwelling.blocks.renovation.title", bodyKey: "ridgeDwelling.blocks.renovation.body" },
      { titleKey: "ridgeDwelling.blocks.life.title", bodyKey: "ridgeDwelling.blocks.life.body" },
      { titleKey: "ridgeDwelling.blocks.operation.title", bodyKey: "ridgeDwelling.blocks.operation.body" },
    ],
    ctas: [
      { labelKey: "ridgeDwelling.ctas.booking", href: "/booking", tone: "primary" },
      { labelKey: "ridgeDwelling.ctas.route", href: "/routes", tone: "secondary" },
    ],
  },
]

export function getSceneDetail(slug: string) {
  return sceneDetails.find((scene) => scene.slug === slug)
}
