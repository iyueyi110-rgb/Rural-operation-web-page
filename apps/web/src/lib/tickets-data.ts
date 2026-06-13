export const ticketProducts = [
  {
    id: "ancient-road-pass",
    sceneKey: "products.ancientRoad.scene",
    nameKey: "products.ancientRoad.name",
    summaryKey: "products.ancientRoad.summary",
    priceKey: "products.ancientRoad.price",
    stockKey: "products.ancientRoad.stock",
  },
  {
    id: "lychee-class",
    sceneKey: "products.lycheeClass.scene",
    nameKey: "products.lycheeClass.name",
    summaryKey: "products.lycheeClass.summary",
    priceKey: "products.lycheeClass.price",
    stockKey: "products.lycheeClass.stock",
  },
  {
    id: "resilience-workshop",
    sceneKey: "products.resilienceWorkshop.scene",
    nameKey: "products.resilienceWorkshop.name",
    summaryKey: "products.resilienceWorkshop.summary",
    priceKey: "products.resilienceWorkshop.price",
    stockKey: "products.resilienceWorkshop.stock",
  },
] as const

export const ticketDateOptions = [
  { value: "2026-06-21", labelKey: "dates.jun21" },
  { value: "2026-06-28", labelKey: "dates.jun28" },
  { value: "2026-07-05", labelKey: "dates.jul05" },
] as const

export const quantityOptions = [1, 2, 3, 4, 5, 6, 8, 10] as const
