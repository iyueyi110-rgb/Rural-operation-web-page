import type { OrchardTree } from "@zouma/contracts"

export type TreeAvailability = "available" | "limited" | "maintenance"
export type AdoptionPlan = "seasonal" | "annual"

export interface OrchardTreeOption extends OrchardTree {
  nameKey: string
  summaryKey: string
  imageAsset: string
  imageAltKey: string
  availability: TreeAvailability
  planPriceKeys: Record<AdoptionPlan, string>
  timeline: Array<{
    dateKey: string
    titleKey: string
    bodyKey: string
  }>
}

export const adoptionPlanOptions = [
  { value: "seasonal", labelKey: "plans.seasonal.label", bodyKey: "plans.seasonal.body" },
  { value: "annual", labelKey: "plans.annual.label", bodyKey: "plans.annual.body" },
] as const

export const orchardTreeOptions: OrchardTreeOption[] = [
  {
    id: "lz018",
    treeCode: "LZ-018",
    nameKey: "trees.lz018.name",
    species: "trees.lz018.species",
    summaryKey: "trees.lz018.summary",
    imageAsset: "/images/trees/lz018-feizixiao-v2.webp",
    imageAltKey: "trees.lz018.imageAlt",
    age: 12,
    healthStatus: "excellent",
    blurredLocation: "trees.lz018.location",
    rights: ["rights.harvestBox", "rights.careUpdates", "rights.certificate", "rights.farmEvent"],
    availability: "available",
    planPriceKeys: {
      seasonal: "trees.lz018.prices.seasonal",
      annual: "trees.lz018.prices.annual",
    },
    timeline: [
      { dateKey: "timeline.spring.date", titleKey: "timeline.spring.title", bodyKey: "timeline.spring.body" },
      { dateKey: "timeline.pruning.date", titleKey: "timeline.pruning.title", bodyKey: "timeline.pruning.body" },
      { dateKey: "timeline.photo.date", titleKey: "timeline.photo.title", bodyKey: "timeline.photo.body" },
    ],
  },
  {
    id: "lz026",
    treeCode: "LZ-026",
    nameKey: "trees.lz026.name",
    species: "trees.lz026.species",
    summaryKey: "trees.lz026.summary",
    imageAsset: "/images/trees/lz026-guiwei-v2.webp",
    imageAltKey: "trees.lz026.imageAlt",
    age: 8,
    healthStatus: "good",
    blurredLocation: "trees.lz026.location",
    rights: ["rights.harvestBox", "rights.careUpdates", "rights.certificate", "rights.familyClass"],
    availability: "limited",
    planPriceKeys: {
      seasonal: "trees.lz026.prices.seasonal",
      annual: "trees.lz026.prices.annual",
    },
    timeline: [
      { dateKey: "timeline.flower.date", titleKey: "timeline.flower.title", bodyKey: "timeline.flower.body" },
      { dateKey: "timeline.photo.date", titleKey: "timeline.photo.title", bodyKey: "timeline.photo.body" },
    ],
  },
  {
    id: "lz041",
    treeCode: "LZ-041",
    nameKey: "trees.lz041.name",
    species: "trees.lz041.species",
    summaryKey: "trees.lz041.summary",
    imageAsset: "/images/trees/lz041-old-tree-v2.webp",
    imageAltKey: "trees.lz041.imageAlt",
    age: 23,
    healthStatus: "fair",
    blurredLocation: "trees.lz041.location",
    rights: ["rights.careUpdates", "rights.certificate"],
    availability: "maintenance",
    planPriceKeys: {
      seasonal: "trees.lz041.prices.seasonal",
      annual: "trees.lz041.prices.annual",
    },
    timeline: [
      { dateKey: "timeline.care.date", titleKey: "timeline.care.title", bodyKey: "timeline.care.body" },
      { dateKey: "timeline.note.date", titleKey: "timeline.note.title", bodyKey: "timeline.note.body" },
    ],
  },
]

export async function fetchTreeProfiles(apiBase = "") {
  try {
    const response = await fetch(`${apiBase}/api/v1/trees`, { cache: "no-store" })
    if (!response.ok) return orchardTreeOptions
    const payload = (await response.json()) as { data?: OrchardTreeOption[] }
    return payload.data && payload.data.length > 0 ? payload.data : orchardTreeOptions
  } catch {
    return orchardTreeOptions
  }
}
