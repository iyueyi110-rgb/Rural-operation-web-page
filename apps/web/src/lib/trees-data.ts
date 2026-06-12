import type { OrchardTree } from "@zouma/contracts"

export type TreeAvailability = "available" | "limited" | "maintenance"
export type AdoptionPlan = "seasonal" | "annual"

export interface TreeCareTimelineItem {
  dateKey: string
  titleKey: string
  bodyKey: string
}

export interface OrchardTreeOption extends OrchardTree {
  availability: TreeAvailability
  nameKey: string
  summaryKey: string
  imageAsset: string
  imageAltKey: string
  planPriceKeys: Record<AdoptionPlan, string>
  timeline: TreeCareTimelineItem[]
}

export const adoptionPlanOptions = [
  { value: "seasonal", labelKey: "plans.seasonal.label", bodyKey: "plans.seasonal.body" },
  { value: "annual", labelKey: "plans.annual.label", bodyKey: "plans.annual.body" },
] as const

export const orchardTreeOptions: OrchardTreeOption[] = [
  {
    id: "tree-lz-018",
    treeCode: "LZ-018",
    species: "trees.lz018.species",
    age: 18,
    healthStatus: "excellent",
    blurredLocation: "trees.lz018.location",
    rights: ["rights.harvestBox", "rights.careUpdates", "rights.certificate", "rights.farmEvent"],
    availability: "available",
    nameKey: "trees.lz018.name",
    summaryKey: "trees.lz018.summary",
    imageAsset: "/images/home/lychee-field-user.webp",
    imageAltKey: "trees.lz018.imageAlt",
    planPriceKeys: { seasonal: "trees.lz018.prices.seasonal", annual: "trees.lz018.prices.annual" },
    timeline: [
      { dateKey: "timeline.spring.date", titleKey: "timeline.spring.title", bodyKey: "timeline.spring.body" },
      { dateKey: "timeline.pruning.date", titleKey: "timeline.pruning.title", bodyKey: "timeline.pruning.body" },
      { dateKey: "timeline.photo.date", titleKey: "timeline.photo.title", bodyKey: "timeline.photo.body" },
    ],
  },
  {
    id: "tree-lz-026",
    treeCode: "LZ-026",
    species: "trees.lz026.species",
    age: 12,
    healthStatus: "good",
    blurredLocation: "trees.lz026.location",
    rights: ["rights.harvestBox", "rights.careUpdates", "rights.familyClass"],
    availability: "limited",
    nameKey: "trees.lz026.name",
    summaryKey: "trees.lz026.summary",
    imageAsset: "/images/home/lychee-field.webp",
    imageAltKey: "trees.lz026.imageAlt",
    planPriceKeys: { seasonal: "trees.lz026.prices.seasonal", annual: "trees.lz026.prices.annual" },
    timeline: [
      { dateKey: "timeline.spring.date", titleKey: "timeline.spring.title", bodyKey: "timeline.spring.body" },
      { dateKey: "timeline.flower.date", titleKey: "timeline.flower.title", bodyKey: "timeline.flower.body" },
      { dateKey: "timeline.photo.date", titleKey: "timeline.photo.title", bodyKey: "timeline.photo.body" },
    ],
  },
  {
    id: "tree-lz-041",
    treeCode: "LZ-041",
    species: "trees.lz041.species",
    age: 25,
    healthStatus: "fair",
    blurredLocation: "trees.lz041.location",
    rights: ["rights.careUpdates", "rights.certificate"],
    availability: "maintenance",
    nameKey: "trees.lz041.name",
    summaryKey: "trees.lz041.summary",
    imageAsset: "/images/home/lychee-field-user.webp",
    imageAltKey: "trees.lz041.imageAlt",
    planPriceKeys: { seasonal: "trees.lz041.prices.seasonal", annual: "trees.lz041.prices.annual" },
    timeline: [
      { dateKey: "timeline.spring.date", titleKey: "timeline.old.title", bodyKey: "timeline.old.body" },
      { dateKey: "timeline.care.date", titleKey: "timeline.care.title", bodyKey: "timeline.care.body" },
      { dateKey: "timeline.note.date", titleKey: "timeline.note.title", bodyKey: "timeline.note.body" },
    ],
  },
]
