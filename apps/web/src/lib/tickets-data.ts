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

export const memberOrders = [
  {
    id: "ZM-BOOKING-001",
    typeKey: "orders.booking.type",
    titleKey: "orders.booking.title",
    statusKey: "orders.booking.status",
    dateKey: "orders.booking.date",
  },
  {
    id: "ZM-TREE-018",
    typeKey: "orders.tree.type",
    titleKey: "orders.tree.title",
    statusKey: "orders.tree.status",
    dateKey: "orders.tree.date",
  },
  {
    id: "ZM-TICKET-RAIN",
    typeKey: "orders.ticket.type",
    titleKey: "orders.ticket.title",
    statusKey: "orders.ticket.status",
    dateKey: "orders.ticket.date",
  },
] as const

export const consentItems = [
  {
    id: "privacy-policy",
    titleKey: "items.policy.title",
    bodyKey: "items.policy.body",
    statusKey: "items.policy.status",
  },
  {
    id: "data-collection",
    titleKey: "items.data.title",
    bodyKey: "items.data.body",
    statusKey: "items.data.status",
  },
  {
    id: "ai-processing",
    titleKey: "items.ai.title",
    bodyKey: "items.ai.body",
    statusKey: "items.ai.status",
  },
] as const
