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

export interface FeedbackHandlingRecord {
  id: string
  status: Feedback["status"]
  note: string
  operator: string
  createdAt: string
}

export interface FeedbackRecord extends Feedback {
  id: string
  source: "web" | "admin"
  submittedAt: string
  updatedAt: string
  handlingRecords: FeedbackHandlingRecord[]
}

// ==== AIGC 云脑新增 ====

export type SpaceNodeType = "entrance" | "viewpoint" | "activity" | "rest" | "shop" | "waterside"
export type PresenceSource = "wifi_probe" | "camera" | "infrared" | "manual"
export type OrderType = "courtyard_booking" | "tree_adoption" | "ticket_order"

export interface SpaceNodeData {
  id: string
  slug: string
  nameKey: string
  realm: SceneRealm
  nodeType: SpaceNodeType
  lat?: number
  lng?: number
  capacity: number
  terrainRisk: number
  watersideRisk: number
}

export interface PresenceLogData {
  id: string
  nodeId: string
  timestamp: string
  peopleCount: number
  dwellAvgMin?: number
  source: PresenceSource
}

export interface NodeDailyScoreData {
  id: string
  nodeId: string
  date: string
  totalVisitors: number
  peakPeopleCount: number
  avgDwellMin: number
  attractiveness: number
  safetyRisk: number
  weatherCondition?: string
}

export interface UnifiedOrderData {
  id: string
  orderType: OrderType
  productId: string
  productName: string
  quantity: number
  totalAmount: number
  status: string
  nodeId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReportSectionData {
  type: "visitor_flow" | "consumption" | "alerts" | "feedback" | "weather"
  title: string
  content: string
}

export interface ReportMetricsData {
  totalVisitors: number
  totalRevenue: number
  totalOrders: number
  alertCount: number
  feedbackCount: number
  avgSatisfaction: number
}

export interface ActionItemData {
  priority: "high" | "medium" | "low"
  category: "safety" | "operation" | "service" | "facility"
  action: string
  deadline?: string
}

export interface DailyReportData {
  id: string
  date: string
  title: string
  summary: string
  sections: ReportSectionData[]
  metrics: ReportMetricsData
  actionItems: ActionItemData[]
  status: string
  generatedAt: string
}
