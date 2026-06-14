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
export type OrderType = "courtyard_booking" | "tree_adoption" | "ticket_order" | "activity_booking" | "product_order"
export type WeatherAlertType = "rainstorm" | "snowstorm" | "heat" | "wind" | "typhoon" | "other"

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
  visitorId?: string
  timestamp: string
  peopleCount: number
  dwellAvgMin?: number
  source: PresenceSource
}

export interface VisitorData {
  id: string
  fingerprint: string
  userAgent?: string
  screenSize?: string
  timezone?: string
  createdAt: string
  updatedAt: string
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
  type: "visitor_flow" | "consumption" | "alerts" | "feedback" | "weather" | "infrastructure"
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

export interface DeviceData {
  id: string
  deviceId: string
  name: string
  type: string
  status: string
  nodeId?: string
  location?: string
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
}

export interface DeviceReadingData {
  id: string
  deviceId: string
  type: string
  value: number
  unit: string
  raw?: Record<string, unknown>
  createdAt: string
}

export interface ProductData {
  id: string
  name: string
  category: string
  description: string
  price?: number
  unit?: string
  stockStatus: string
  nodeId?: string
  imageUrl?: string
  status: string
  createdAt: string
  updatedAt: string
}

export type VillagerSkill = "cooking" | "farming" | "guiding" | "handicraft" | "logistics"
export type VillagerStatus = "active" | "inactive"

export interface VillagerData {
  id: string
  name: string
  phone: string
  skills: VillagerSkill[]
  nodeId?: string
  status: VillagerStatus
  createdAt: string
}

export type SolarTerm =
  | "立春" | "雨水" | "惊蛰" | "春分" | "清明" | "谷雨"
  | "立夏" | "小满" | "芒种" | "夏至" | "小暑" | "大暑"
  | "立秋" | "处暑" | "白露" | "秋分" | "寒露" | "霜降"
  | "立冬" | "小雪" | "大雪" | "冬至" | "小寒" | "大寒"

export type FarmingActivityType = "planting" | "pruning" | "fertilizing" | "harvesting" | "processing" | "festival"
export type FarmingCalendarStatus = "upcoming" | "active" | "completed"

export interface FarmingCalendarData {
  id: string
  solarTerm: SolarTerm
  title: string
  description: string
  activityType: FarmingActivityType
  startDate: string
  endDate?: string
  treeSpecies?: string
  status: FarmingCalendarStatus
}

// ==== P1 新增 ====

export type TreeCareLogType = "watering" | "pruning" | "fertilizing" | "pest_control" | "photo" | "harvest"
export type ActivityType = "village_feast" | "food_class" | "study" | "workshop" | "exhibition" | "co_living"
export type AlertType =
  | "night_linger"
  | "crowd"
  | "waterside"
  | "reverse_path"
  | "fire_risk"
  | "flood_risk"
  | WeatherAlertType

export interface OrchardTreeData {
  id: string
  treeCode: string
  species: string
  age: number
  healthStatus: string
  blurredLocation: string
  lat?: number
  lng?: number
  fireMemory?: string
  newShootsRecord?: string
  growthPhotos: string[]
  adoptStatus: string
  adoptPrice?: number
  harvestSeason?: string
  fruitVariety?: string
}

export interface TreeCareLogData {
  id: string
  treeId: string
  logType: TreeCareLogType
  content: string
  imageUrl?: string
  operator: string
  createdAt: string
}

export interface TreeAdoptionData {
  id: string
  treeId: string
  plan: string
  adopterName?: string
  adopterPhone?: string
  status: string
  createdAt: string
  updatedAt: string
}

export type HarvestShipmentStatus = "pending" | "picking" | "shipping" | "delivered"

export interface HarvestShipmentData {
  id: string
  harvestBookingId: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  courier?: string
  trackingNumber?: string
  status: HarvestShipmentStatus
  shippedAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
}

export interface HarvestBookingData {
  id: string
  treeId: string
  scheduledDate: string
  timeSlot: string
  guestCount: number
  guestName?: string
  guestPhone?: string
  fruitDestination?: string
  destinationNote?: string
  status: string
  createdAt: string
  shipment?: HarvestShipmentData
}

export interface AlertData {
  id: string
  alertType: AlertType
  nodeId?: string
  severity: "high" | "medium" | "low"
  message: string
  status: "active" | "acknowledged" | "resolved"
  createdAt: string
  resolvedAt?: string
}

export interface WeatherAlertData {
  id: string
  type: WeatherAlertType
  severity: "high" | "medium" | "low"
  title: string
  text: string
  startTime?: string
  endTime?: string
  createdAt: string
  source: "qweather"
}

export interface CourtyardActivityData {
  id: string
  courtyardId: string
  activityType: ActivityType
  title: string
  description: string
  maxCapacity: number
  price?: number
  scheduledDate: string
  scheduledTime: string
  status: string
}

export interface ActivityBookingData {
  id: string
  activityId: string
  guestName: string
  guestPhone: string
  guestCount: number
  status: string
  createdAt: string
}

export type SensorReadingType = "rainfall" | "soil_moisture" | "water_level" | "temperature" | "humidity"
export type ControlCommandType = "irrigation" | "flood_alert" | "fire_alert" | "rain_delay"
export type ControlCommandStatus = "pending" | "approved" | "executed" | "rejected"

export interface SensorReadingData {
  id: string
  sensorId: string
  type: SensorReadingType | string
  value: number
  unit: string
  nodeId?: string
  source?: string
  createdAt: string
}

export interface ControlSuggestionData {
  type: ControlCommandType
  priority: "critical" | "high" | "medium" | "low"
  reason: string
  targetNodeId?: string
  payload?: Record<string, unknown>
  triggeredBy: "ai" | "rule_engine"
}

export interface ControlCommandData extends ControlSuggestionData {
  id: string
  status: ControlCommandStatus
  createdAt: string
  updatedAt: string
}
