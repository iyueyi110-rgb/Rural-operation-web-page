export type SceneRealm =
  | "ancient_road"
  | "lychee_field"
  | "resilience_valley"
  | "ridge_dwelling"

export type TranslationKey = string

export interface Scene {
  slug: string
  realm: SceneRealm
  titleKey: TranslationKey
  summaryKey: TranslationKey
  coverAsset: string
  updatedAt: string
  cta: {
    labelKey: TranslationKey
    href: string
  }
}

export interface RoutePlan {
  inputs: {
    duration: number
    audience: "senior" | "family" | "regular"
    weather: "sunny" | "rainy" | "hot"
  }
  duration: number
  mobilityTag: "easy" | "moderate" | "challenging"
  weatherTag: "sunny" | "rainy" | "hot"
  waypoints: string[]
  reservationNodes: string[]
  rainFallback: string
}

export interface Courtyard {
  id: string
  sceneRealm: SceneRealm
  capacity: number
  inventoryStatus: "available" | "limited" | "booked" | "maintenance"
  priceLabel: TranslationKey
  amenities: TranslationKey[]
  bookingNotice: TranslationKey
}

export interface OrchardTree {
  id: string
  treeCode: string
  species: TranslationKey
  age: number
  healthStatus: "excellent" | "good" | "fair" | "poor"
  blurredLocation: TranslationKey
  rights: TranslationKey[]
}

export interface Feedback {
  category: "content" | "service" | "facility" | "payment" | "other"
  severity: "low" | "medium" | "high" | "urgent"
  content: string
  rating: number
  status: "submitted" | "assigned" | "processing" | "resolved" | "closed"
}
