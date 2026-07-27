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
  | "submitted"
  | "rejected"
  | "resubmitted"
  | "approved"
  | "settled"
  | "exception_reported"
  | "overdue"
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
  adoptionId?: string
  treeId?: string
  deadlineAt?: string
  acceptedAt?: string
  submittedAt?: string
  completedAt?: string
  evidenceRequirements?: Record<string, unknown>
  version?: number
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

export type AdoptionWorkflowStatus =
  | "pending_payment"
  | "active"
  | "benefit_pending"
  | "fulfilled"
  | "renewal_pending"
  | "renewed"
  | "expired"
  | "cancelled"
  | "refund_requested"
  | "refund_reviewing"
  | "refunded"
  | "refund_rejected"

export type FulfillmentTaskAction =
  | "accept"
  | "start"
  | "submit_evidence"
  | "resubmit"
  | "report_exception"
  | "approve"
  | "reject"
  | "settle"
  | "mark_overdue"

export interface FulfillmentMediaItem {
  url: string
  hash: string
  mimeType: "image/jpeg" | "image/png" | "image/webp"
  size: number
}

export interface FulfillmentEvidenceData {
  id: string
  adoptionId: string
  taskId: string
  submittedBy: string
  description: string
  media: FulfillmentMediaItem[]
  version: number
  status: "submitted" | "approved" | "rejected"
  submittedAt: string
}

export type KnowledgeAnswerStatus =
  | "answered"
  | "knowledge_not_published"
  | "insufficient_evidence"
  | "permission_denied"
  | "conflicting_rules"
  | "specific_case_requires_operator"
  | "prohibited_action"

export interface KnowledgeCitation {
  documentId: string
  title: string
  version: string
  section: string
  quote: string
}

export interface KnowledgeAnswerData {
  answer: string
  status: KnowledgeAnswerStatus
  citations: KnowledgeCitation[]
  allowedRoles: Array<"operator" | "villager">
  requiresHuman: boolean
}

export type AdoptionRecommendationType =
  | "adoption_deadline_risk"
  | "adoption_unclaimed_task"
  | "adoption_evidence_incomplete"
  | "adoption_weather_delay"
  | "adoption_repeated_exception"

export interface AdoptionAgentSuggestion {
  runId: string
  riskLevel: "low" | "medium" | "high"
  adoptionId: string
  taskId: string
  riskType:
    | "deadline"
    | "unclaimed"
    | "evidence"
    | "weather"
    | "repeated_exception"
  evidenceRefs: string[]
  summary: string
  recommendedAction:
    | "remind"
    | "reassign"
    | "extend"
    | "manual_review"
    | "no_action"
  reason: string
  confidence: number
  requiresHumanApproval: true
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

// ==== 认养规则模拟（与真实运营数据严格隔离） ====

export type DataOrigin = "real_user" | "evaluation_set" | "simulation"
export type PolicyVersion = "V0" | "V1"
export type ScenarioId =
  | "NORMAL"
  | "ADOPTION_PEAK"
  | "STAFF_SHORTAGE"
  | "CONTINUOUS_RAIN"
  | "LOW_SUBMISSION_QUALITY"
  | "REMOTE_ZONE_LOAD"
  | "REVIEW_BACKLOG"
  | "HARVEST_PEAK"

export type SimulationTaskType =
  | "watering"
  | "fertilizing"
  | "pest_inspection"
  | "growth_photo"
  | "tree_health_record"
  | "fruit_inspection"
  | "harvest"
  | "packing"
  | "shipping"
  | "onsite_reception"
  | "drainage"

export type SimulationAdoptionStatus =
  | "created"
  | "pending_payment"
  | "paid"
  | "active"
  | "harvest_ready"
  | "fulfillment_pending"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed"

export type SimulationTaskStatus =
  | "created"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "submitted"
  | "approved"
  | "completed"
  | "rejected"
  | "returned"
  | "overdue"
  | "reassigned"
  | "cancelled"

export type SimulationEventType =
  | "ADOPTION_CREATED"
  | "ADOPTION_PAID"
  | "ADOPTION_ACTIVATED"
  | "ADOPTION_FULFILLING"
  | "ADOPTION_COMPLETED"
  | "ADOPTION_STATUS_CHANGED"
  | "ADOPTION_CANCELLED"
  | "ADOPTION_REFUNDED"
  | "ADOPTION_DISPUTED"
  | "TREE_ASSIGNED"
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_ACCEPTED"
  | "TASK_REJECTED"
  | "TASK_REASSIGNED"
  | "ASSIGNMENT_EXPIRED"
  | "ASSIGNMENT_ESCALATED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_SETTLED"
  | "TASK_CANCELLED"
  | "TASK_SUBMITTED"
  | "SUBMISSION_PRECHECK_FAILED"
  | "REVIEW_STARTED"
  | "REVIEW_APPROVED"
  | "REVIEW_RETURNED"
  | "TASK_OVERDUE"
  | "REMINDER_SENT"
  | "WEATHER_DELAY_APPROVED"
  | "GROWTH_UPDATE_SENT"
  | "HARVEST_COMPLETED"
  | "PACKAGE_SHIPPED"
  | "BENEFIT_FULFILLED"
  | "SIMULATION_COMPLETED"
  | "MANUAL_INTERVENTION"
  | "ANOMALY_DETECTED"
  | "INVENTORY_SHORTAGE"

export interface SimulationConfig {
  seed: number
  durationDays: number
  adoptionCount: number
  treeCount: number
  villagerCount: number
  reviewerCount: number
  tasksPerAdoption: { min: number; max: number }
  scenario: ScenarioId
  startAt: string
  weatherEnabled: boolean
  anomalyEnabled: boolean
}

export interface SimulationValidationResult {
  valid: boolean
  errors: string[]
}

export interface SimulationTree {
  id: string
  zone: "near" | "mid" | "remote"
  healthScore: number
}

export interface SimulationAdoption {
  id: string
  treeId?: string
  status: SimulationAdoptionStatus
  createdAt: string
}

export interface SimulationVillager {
  id: string
  skills: SimulationTaskType[]
  zone: SimulationTree["zone"]
  dailyCapacity: number
  reliability: number
  historicalAcceptanceRate: number
  historicalOnTimeRate: number
  historicalFirstPassRate: number
  available: boolean
}

export interface SimulationVillagerAvailabilitySnapshot {
  villagerId: string
  date: string
  attendanceScore: number
  availabilityScore: number
  available: boolean
}

export interface SimulationReviewer {
  id: string
  dailyCapacity: number
  available: boolean
}

export interface SimulationWeatherDay {
  day: number
  date: string
  condition: "clear" | "cloudy" | "rain" | "heavy_rain"
}

export interface SimulationTaskSeed {
  id: string
  adoptionId: string
  treeId: string
  taskType: SimulationTaskType
  zone: SimulationTree["zone"]
  priority: 1 | 2 | 3
  createdAt: string
  dueAt: string
  acceptRoll: number
  qualityRoll: number
  anomalyRoll: number
  clarityRoll: number
  duplicateRoll: number
  executionHours: number
  reviewHours: number
}

export interface SimulationScenarioSnapshot {
  id: ScenarioId
  adoptionMultiplier: number
  unavailableVillagers: number
  unavailableReviewers: number
  heavyRainDays: number
  qualityPenalty: number
  remoteZoneRatio: number
  reviewDelayMultiplier: number
  harvestTaskRatio: number
}

export interface SimulationWorld {
  dataOrigin: "simulation"
  seed: number
  config: SimulationConfig
  scenarioSnapshot: SimulationScenarioSnapshot
  trees: SimulationTree[]
  adoptions: SimulationAdoption[]
  villagers: SimulationVillager[]
  villagerAvailability: SimulationVillagerAvailabilitySnapshot[]
  reviewers: SimulationReviewer[]
  weather: SimulationWeatherDay[]
  tasks: SimulationTaskSeed[]
  worldHash: string
}

export interface SimulationProvenance {
  dataOrigin: "simulation"
  simulationRunId: string
  policyVersion: PolicyVersion
  policyRevision: string
}

export interface SimulationAssignment extends SimulationProvenance {
  id: string
  taskId: string
  villagerId?: string
  attempt: number
  status: "assigned" | "accepted" | "rejected" | "expired" | "escalated"
  assignedAt: string
  respondedAt?: string
  responseDeadlineAt: string
  score?: number
}

export interface SimulationSubmissionQuality {
  photoClarity: number
  fieldCompleteness: number
  evidenceConsistency: number
  descriptionQuality: number
  duplicatePhotoRisk: number
  taskResultValid: boolean
}

export interface SimulationSubmission extends SimulationProvenance {
  id: string
  taskId: string
  villagerId: string
  attempt: number
  submittedAt: string
  structured: boolean
  quality: SimulationSubmissionQuality
  precheckPassed?: boolean
}

export interface SimulationReview extends SimulationProvenance {
  id: string
  taskId: string
  submissionId: string
  reviewerId: string
  attempt: number
  status: "approved" | "returned"
  startedAt: string
  completedAt: string
  reasons: string[]
}

export interface SimulationFulfillment extends SimulationProvenance {
  id: string
  adoptionId: string
  taskId: string
  type: "harvest" | "packing" | "shipping" | "onsite_reception"
  promisedAt: string
  completedAt: string
  onTime: boolean
}

export interface SimulationTaskResult extends SimulationProvenance {
  id: string
  adoptionId: string
  treeId: string
  taskType: SimulationTaskType
  status: SimulationTaskStatus
  zone: SimulationTree["zone"]
  assignedVillagerId?: string
  assignmentAttempts: number
  createdAt: string
  assignedAt?: string
  dueAt: string
  effectiveDueAt: string
  acceptedAt?: string
  submittedAt?: string
  approvedAt?: string
  completedAt?: string
  firstReviewPassed?: boolean
  finalReviewPassed?: boolean
  anomalyExpected: boolean
  anomalyDetected?: boolean
  rightsFulfilledOnTime?: boolean
}

export interface SimulationEvent extends SimulationProvenance {
  id: string
  eventType: SimulationEventType
  scenarioId: ScenarioId
  randomSeed: number
  entityType:
    | "adoption"
    | "tree"
    | "task"
    | "assignment"
    | "submission"
    | "review"
    | "fulfillment"
    | "simulation"
  entityId: string
  occurredAt: string
  adoptionId?: string
  taskId?: string
  actorId?: string
  actorType: "system" | "villager" | "reviewer" | "operator"
  fromStatus?: string
  toStatus?: string
  payload: Record<string, unknown>
}

export type SimulationBadCaseCategory =
  | "inventory_shortage"
  | "assignment_exhausted"
  | "overdue"
  | "quality_return"
  | "review_backlog"
  | "rights_delay"
  | "anomaly_missed"

export interface SimulationBadCase extends SimulationProvenance {
  id: string
  category: SimulationBadCaseCategory
  severity: "low" | "medium" | "high" | "critical"
  adoptionId?: string
  taskId?: string
  title: string
  description: string
  eventIds: string[]
  rootCause?: string
  improvementAction?: string
}

export type SimulationMetricKey =
  | "acceptance_rate"
  | "on_time_submission_rate"
  | "first_review_pass_rate"
  | "final_review_pass_rate"
  | "reassignment_rate"
  | "overdue_rate"
  | "average_acceptance_hours"
  | "average_review_hours"
  | "review_return_rate"
  | "rights_on_time_fulfillment_rate"
  | "anomaly_detection_rate"
  | "assignment_fairness_cv"
  | "manual_intervention_count"

export interface SimulationMetric extends SimulationProvenance {
  key: SimulationMetricKey
  numerator: number
  denominator: number
  value: number | null
  unit: "ratio" | "hours" | "count" | "coefficient"
  definition: string
}

export interface SimulationRun extends SimulationProvenance {
  pairId?: string
  worldHash: string
  seed: number
  scenario: ScenarioId
  config: SimulationConfig
  status: "completed" | "failed"
  startedAt: string
  completedAt: string
  tasks: SimulationTaskResult[]
  assignments: SimulationAssignment[]
  submissions: SimulationSubmission[]
  reviews: SimulationReview[]
  fulfillments: SimulationFulfillment[]
  events: SimulationEvent[]
  badCases: SimulationBadCase[]
  metrics: Record<SimulationMetricKey, SimulationMetric>
}

export interface SimulationRunPair {
  pairId: string
  world: SimulationWorld
  v0: SimulationRun
  v1: SimulationRun
}

export type SimulationRecommendation =
  | "模拟结果建议采用V1"
  | "模拟结果暂不支持升级"
  | "存在场景退化，需要继续调整"
  | "样本不足，暂不形成结论"

export interface SimulationMetricComparison {
  key: SimulationMetricKey
  v0: number | null
  v1: number | null
  absoluteDifference: number | null
  percentagePointDifference: number | null
  safeRelativeChange: number | null
}

export interface SimulationComparison {
  id: string
  dataOrigin: "simulation"
  v0RunId: string
  v1RunId: string
  v0PolicyRevision: string
  v1PolicyRevision: string
  policyVersions: ["V0", "V1"]
  worldHash: string
  seed: number
  scenario: ScenarioId
  metrics: Record<SimulationMetricKey, SimulationMetricComparison>
  recommendation: SimulationRecommendation
  reasons: string[]
}

export type SimulationExportArtifactName =
  | "simulation_config.json"
  | "simulation_runs.csv"
  | "simulation_events.csv"
  | "simulation_tasks.csv"
  | "simulation_assignments.csv"
  | "simulation_submissions.csv"
  | "simulation_reviews.csv"
  | "simulation_bad_cases.csv"
  | "simulation_metrics.json"
  | "simulation_comparison.json"
  | "simulation_report.md"

export type SimulationExportArtifacts = Record<
  SimulationExportArtifactName,
  string
>

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
export type BuildingCondition =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "critical"
export type DemolitionRecommendation =
  | "none"
  | "partial"
  | "full"
  | "conditional"
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
  category:
    | "structural"
    | "insulation"
    | "finishing"
    | "ecological"
    | "energy_system"
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
  type:
    | "insulation"
    | "ventilation"
    | "solar"
    | "rainwater"
    | "greening"
    | "lighting"
    | "heating_cooling"
  name: string
  description: string
  materials: string[]
  estimatedEnergySaving: string
  implementationNotes: string
}

export interface EcologicalMeasure {
  type:
    | "greening"
    | "water_management"
    | "biodiversity"
    | "soil_restoration"
    | "microclimate"
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
  photoUrl?: string
  photoAlt?: string
  building?: {
    age?: number
    material?: string
    floors?: number
    area?: number
    structuralCondition?: BuildingCondition
    energyScore?: number
    heritageStatus?: string
  }
  diagnosis?: Pick<
    SpatialDiagnosisData,
    "id" | "urgency" | "aiSummary" | "issues" | "evidenceJson"
  >
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
