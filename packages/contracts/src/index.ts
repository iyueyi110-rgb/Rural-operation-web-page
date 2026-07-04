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

export type SpaceNodeType =
  | "entrance"
  | "viewpoint"
  | "activity"
  | "rest"
  | "shop"
  | "waterside"
export type PresenceSource = "wifi_probe" | "camera" | "infrared" | "manual"
export type OrderType =
  | "courtyard_booking"
  | "tree_adoption"
  | "ticket_order"
  | "activity_booking"
  | "product_order"
export type WeatherAlertType =
  | "rainstorm"
  | "snowstorm"
  | "heat"
  | "wind"
  | "typhoon"
  | "other"

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
  type:
    | "visitor_flow"
    | "consumption"
    | "alerts"
    | "feedback"
    | "weather"
    | "infrastructure"
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
  villagerStats?: {
    completedTaskCount: number
    totalEarnings: number
    participantCount: number
  }
  trafficForecast?: {
    low: number
    high: number
    confidence: "high" | "medium" | "low"
  }
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

export type VillagerSkill =
  | "cooking"
  | "farming"
  | "guiding"
  | "handicraft"
  | "logistics"
export type VillagerStatus = "active" | "inactive"
export type TaskType =
  | "farming"
  | "guiding"
  | "logistics"
  | "maintenance"
  | "service"
export type TaskStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"

export interface VillagerTaskSummary {
  totalTasks: number
  completedTasks: number
  totalEarnings: number
}

export interface VillagerData {
  id: string
  name: string
  phone: string
  skills: VillagerSkill[]
  nodeId?: string
  status: VillagerStatus
  createdAt: string
  taskSummary?: VillagerTaskSummary
  monthlyTaskSummary?: VillagerTaskSummary
}

export interface TaskData {
  id: string
  title: string
  description?: string
  taskType: TaskType
  status: TaskStatus
  villagerId?: string
  nodeId?: string
  scheduledDate?: string
  earnings: number
  createdAt: string
  updatedAt: string
}

export type SolarTerm =
  | "立春"
  | "雨水"
  | "惊蛰"
  | "春分"
  | "清明"
  | "谷雨"
  | "立夏"
  | "小满"
  | "芒种"
  | "夏至"
  | "小暑"
  | "大暑"
  | "立秋"
  | "处暑"
  | "白露"
  | "秋分"
  | "寒露"
  | "霜降"
  | "立冬"
  | "小雪"
  | "大雪"
  | "冬至"
  | "小寒"
  | "大寒"

export type FarmingActivityType =
  | "planting"
  | "pruning"
  | "fertilizing"
  | "harvesting"
  | "processing"
  | "festival"
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

export type TreeCareLogType =
  | "watering"
  | "pruning"
  | "fertilizing"
  | "pest_control"
  | "photo"
  | "harvest"
export type ActivityType =
  | "village_feast"
  | "food_class"
  | "study"
  | "workshop"
  | "exhibition"
  | "co_living"
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
  hiddenGeo?: string
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
  treeCode?: string
  hiddenGeo?: string
  plan: string
  adopterName?: string
  adopterPhone?: string
  status: string
  createdAt: string
  updatedAt: string
  harvestBookings?: HarvestBookingData[]
}

export type InteractionTaskType =
  | "watering"
  | "fertilizing"
  | "photo_upload"
  | "diary"
  | "share"

export type InteractionTaskStatus = "pending" | "completed" | "expired"

export interface InteractionTaskData {
  id: string
  adoptionId: string
  treeId: string
  taskType: InteractionTaskType
  title: string
  description?: string
  status: InteractionTaskStatus
  periodKey?: string
  maxCompletions: number
  completionCount: number
  pointsPerCompletion: number
  totalPointsEarned: number
  seasonEventId?: string
  completedAt?: string
  imageUrl?: string
  note?: string
  points: number
  createdAt: string
  updatedAt: string
}

export interface InteractionTaskSummary {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalCompletions: number
  completedCompletions: number
  pendingCompletions: number
  totalPointsEarned: number
  completionRate: number
  tasksByType: Record<InteractionTaskType, { total: number; completed: number }>
}

export interface AdoptionPointsData {
  adoptionId: string
  totalPoints: number
  availablePoints: number
  redeemedPoints: number
}

export interface PointsTransactionData {
  id: string
  amount: number
  type: "earn" | "redeem" | "expire" | "adjust"
  source: string
  referenceId?: string
  note?: string
  createdAt: string
}

export interface SeasonEventData {
  id: string
  solarTerm: string
  title: string
  description?: string
  taskType: InteractionTaskType
  bonusPoints: number
  startDate: string
  endDate: string
  imageUrl?: string
  status: "active" | "ended"
}

export interface RedemptionOptionData {
  id: string
  title: string
  description?: string
  pointsCost: number
  type: "coupon" | "rights" | "physical" | "digital"
  stock: number
  redeemedCount: number
  imageUrl?: string
  status: "active" | "inactive"
}

export interface RedemptionRecordData {
  id: string
  adoptionId: string
  optionId: string
  pointsSpent: number
  status: "pending" | "fulfilled" | "cancelled"
  note?: string
  createdAt: string
  fulfilledAt?: string
  option?: RedemptionOptionData
}

export type HarvestShipmentStatus =
  | "pending"
  | "picking"
  | "shipping"
  | "delivered"

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

export type SensorReadingType =
  | "rainfall"
  | "soil_moisture"
  | "water_level"
  | "temperature"
  | "humidity"
export type ControlCommandType =
  | "irrigation"
  | "flood_alert"
  | "fire_alert"
  | "rain_delay"
export type ControlCommandStatus =
  | "pending"
  | "approved"
  | "executed"
  | "rejected"

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

// ==== 建筑空间改造策略系统 ====

export type RenovationDimension = "energy" | "spatial" | "ecological"
export type RenovationCategory =
  | "structural_repair"
  | "energy_retrofit"
  | "spatial_reorganization"
  | "ecological_restoration"
  | "facade_renovation"
  | "infrastructure_upgrade"
  | "microclimate_improvement"
  | "accessibility_improvement"
export type RenovationStatus =
  | "draft"
  | "review"
  | "approved"
  | "in_progress"
  | "completed"
  | "verified"
export type DiagnosisUrgency = "critical" | "high" | "medium" | "low"
export type BuildingCondition = "excellent" | "good" | "fair" | "poor" | "critical"
export type DemolitionRecommendation = "none" | "partial" | "full" | "conditional"
export type ReusePotential = "high" | "medium" | "low" | "none"
export type InterventionType =
  | "renovation"
  | "partial_demolish_rebuild"
  | "full_demolish_rebuild"
  | "new_construction"
  | "extension"
  | "adaptive_reuse"
  | "landscape_intervention"

export interface BuildingAssessmentData {
  id: string
  nodeId: string
  assessorId?: string
  assessedAt: string
  structuralScore: number
  aestheticScore: number
  functionalScore: number
  safetyScore: number
  energyScore: number
  ecologicalScore: number
  demolitionRecommendation?: DemolitionRecommendation
  demolitionReason?: string
  reusePotential?: ReusePotential
  retainedElements: RetainedElement[]
  issues: BuildingIssue[]
  notes?: string
  photos: string[]
  source: string
}

export interface BuildingIssue {
  category: RenovationDimension | "safety" | "accessibility"
  severity: "critical" | "major" | "minor"
  description: string
  location?: string
  photoRefs?: string[]
}

export interface RetainedElement {
  element: string
  condition: "excellent" | "good" | "fair" | "poor"
  reuseAs: string
  notes?: string
}

export interface SpatialDiagnosisData {
  id: string
  nodeId: string
  bizDate: string
  urgency: DiagnosisUrgency
  issues: DiagnosisIssue[]
  evidenceJson: DiagnosisEvidence
  aiSummary?: string
  energyIssues: DiagnosisIssue[]
  spatialIssues: DiagnosisIssue[]
  ecologicalIssues: DiagnosisIssue[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface DiagnosisIssue {
  code: string
  title: string
  description: string
  severity: "critical" | "major" | "minor"
  dimension: RenovationDimension
  evidenceKeys: string[]
  suggestedActions: string[]
}

export interface DiagnosisEvidence {
  crowdStress: number
  feedbackRatio: number
  safetyScore: number
  energyScore: number
  ecologicalScore: number
  conversionRate: number | null
  sensorAnomalies: string[]
  recentAlerts: number
}

export interface RenovationMaterial {
  name: string
  category: "structural" | "insulation" | "finishing" | "ecological" | "energy_system"
  specification: string
  ecoLabel?: string
  localAvailability: "high" | "medium" | "low"
  unitCost?: string
  notes?: string
}

export interface RenovationTechnique {
  name: string
  category: "traditional" | "modern" | "hybrid"
  description: string
  applicableConditions: string[]
  constructionSteps: string[]
  laborRequirement: "low" | "medium" | "high"
  notes?: string
}

export interface EnergyConstructionDetail {
  type: "insulation" | "ventilation" | "solar" | "rainwater" | "greening" | "lighting" | "heating_cooling"
  name: string
  description: string
  materials: string[]
  estimatedEnergySaving: string
  implementationNotes: string
}

export interface EcologicalMeasure {
  type: "greening" | "water_management" | "biodiversity" | "soil_restoration" | "microclimate"
  name: string
  description: string
  speciesOrMaterials: string[]
  expectedEcologicalBenefit: string
}

export interface ArchitecturalForm {
  formLanguage: string
  massingStrategy: string
  materialPalette: string[]
  roofType: string
  elevationStrategy: string
  relationshipToGround: string
  referenceImages: string[]
}

export interface BuildingProgramItem {
  space: string
  area: number
  capacity: number
  requirements: string[]
  notes?: string
}

export interface RenovationStrategyData {
  id: string
  nodeId: string
  diagnosisId?: string
  category: RenovationCategory
  title: string
  description: string
  dimension: RenovationDimension
  materials: RenovationMaterial[]
  techniques: RenovationTechnique[]
  energyConstruction: EnergyConstructionDetail[]
  ecologicalMeasures: EcologicalMeasure[]
  interventionType?: InterventionType
  oldNewRelationship?: string
  architecturalForm?: ArchitecturalForm
  buildingProgram?: BuildingProgramItem[]
  estimatedDuration?: string
  difficultyLevel?: string
  estimatedCostRange?: string
  expectedImpact?: string
  priority: "critical" | "high" | "medium" | "low"
  status: RenovationStatus
  approvedBy?: string
  approvedAt?: string
  completedAt?: string
  verifiedAt?: string
  beforeMetrics: Record<string, number>
  afterMetrics: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface SiteConstraint {
  type:
    | "setback"
    | "height_limit"
    | "heritage_buffer"
    | "flood_zone"
    | "tree_protection"
    | "utility_easement"
  description: string
  distance?: number
}

export interface SitePotentialData {
  id: string
  nodeId: string
  locationName: string
  locationLat: number
  locationLng: number
  siteArea?: number
  currentUse?: string
  suitabilityScore: number
  accessibilityScore: number
  viewScore: number
  ecologyImpactScore: number
  recommendedProgram?: string
  recommendedForm?: string
  recommendedFloors?: number
  recommendedGFA?: number
  formKeywords: string[]
  constraints: SiteConstraint[]
  rationale?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface RenovationImpactReport {
  nodeId: string
  nodeSlug: string
  strategyId: string
  period: { before: string; after: string }
  metrics: {
    visitorChange: number
    satisfactionChange: number
    safetyRiskChange: number
    energyScoreChange: number
    conversionRateChange: number
    feedbackReduction: number
  }
  verdict: "significantly_improved" | "improved" | "no_change" | "degraded"
  summary: string
}

export interface RenovationPublicStrategy {
  id: string
  title: string
  description: string
  dimension: RenovationDimension
  interventionType?: InterventionType
  priority: "critical" | "high" | "medium" | "low"
  estimatedDuration?: string
  estimatedCostRange?: string
  expectedImpact?: string
}

export interface RenovationPublicNode {
  nodeId: string
  slug: string
  nameKey: string
  realm: string
  nodeType: string
  building?: {
    age?: number
    material?: string
    floors?: number
    area?: number
    structuralCondition?: BuildingCondition
    energyScore?: number
    heritageStatus?: string
  }
  diagnosis?: Pick<SpatialDiagnosisData, "id" | "urgency" | "aiSummary" | "issues" | "evidenceJson">
  strategies: RenovationPublicStrategy[]
  sitePotentials?: SitePotentialData[]
  demo?: boolean
}

export interface SpaceNodeBuildingData extends SpaceNodeData {
  buildingAge?: number
  buildingMaterial?: string
  buildingFloors?: number
  buildingArea?: number
  buildingOrientation?: string
  heritageStatus?: string
  lastRenovationAt?: string
  structuralCondition?: BuildingCondition
  aestheticCondition?: BuildingCondition
  functionalCondition?: BuildingCondition
  energyScore?: number
  insulationQuality?: string
  ventilationQuality?: string
  solarPotential?: string
  energyConsumptionEst?: number
  greeneryCoverage?: number
  waterPermeability?: string
  biodiversityIndex?: string
  microclimateZone?: string
  photos: string[]
}
