import "server-only"

import type {
  ArchitecturalForm,
  BuildingProgramItem,
  BuildingAssessmentData,
  EcologicalMeasure,
  EnergyConstructionDetail,
  RenovationMaterial,
  RenovationPublicNode,
  RenovationPublicStrategy,
  RenovationStrategyData,
  SitePotentialData,
} from "@zouma/contracts"
import { prisma, type Prisma } from "@zouma/database"
import type { DiagnosisInput, DiagnosisIssue } from "@zouma/utils"

import { getChinaDateString, getChinaDayRange } from "@web/lib/aigc-api"
import { runFullDiagnosis } from "@web/lib/diagnosis-generator"
import { generateAllRenovationPlans } from "@web/lib/renovation-generator"

function jsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function jsonObject<T extends Record<string, unknown>>(value: Prisma.JsonValue | null | undefined, fallback: T): T {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : fallback
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export async function collectRenovationDiagnosisInput(nodeId: string, bizDate = getChinaDateString()): Promise<DiagnosisInput> {
  const { start, end } = getChinaDayRange(bizDate)
  const node = await prisma.spaceNode.findUnique({
    where: { id: nodeId },
    include: {
      assessments: { orderBy: { assessedAt: "desc" }, take: 1 },
    },
  })

  if (!node) {
    throw new Error("Space node not found")
  }

  const [dailyScore, presenceAgg, feedbackAgg, urgentFeedback, orderCount, alerts, readings] = await Promise.all([
    prisma.nodeDailyScore.findUnique({ where: { nodeId_date: { nodeId, date: bizDate } } }),
    prisma.presenceLog.aggregate({
      where: { nodeId, timestamp: { gte: start, lte: end } },
      _sum: { peopleCount: true },
      _max: { peopleCount: true },
      _avg: { dwellAvgMin: true },
    }),
    prisma.feedbackTicket.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.feedbackTicket.count({
      where: { createdAt: { gte: start, lte: end }, severity: { in: ["urgent", "critical", "high"] } },
    }),
    prisma.unifiedOrder.count({
      where: { nodeId, createdAt: { gte: start, lte: end } },
    }),
    prisma.alert.findMany({
      where: { nodeId, status: "active" },
      select: { alertType: true, severity: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.deviceReading.findMany({
      where: { device: { nodeId }, createdAt: { gte: start, lte: end } },
      select: { type: true, value: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const assessment = node.assessments[0] ?? null
  const visitors = presenceAgg._sum.peopleCount ?? dailyScore?.totalVisitors ?? 0
  const peakPeople = presenceAgg._max.peopleCount ?? dailyScore?.peakPeopleCount ?? 0
  const sensorAnomalies = readings.flatMap((reading) => {
    if (reading.type === "temperature" && reading.value > 32) return ["temperature_high"]
    if (reading.type === "humidity" && reading.value > 85) return ["humidity_high"]
    if (reading.type === "soil_moisture" && reading.value < 20) return ["soil_dry"]
    if (reading.type === "water_level" && reading.value < 10) return ["water_low"]
    return []
  })

  return {
    nodeId,
    dailyScores: {
      avgAttractiveness: dailyScore?.attractiveness ?? 0,
      avgSafetyRisk: dailyScore?.safetyRisk ?? alerts.length,
      peakVisitorDensity: dailyScore?.peakPeopleCount ? dailyScore.peakPeopleCount / Math.max(node.capacity, 1) : peakPeople / Math.max(node.capacity, 1),
      weatherDays: dailyScore?.weatherCondition ? { [dailyScore.weatherCondition]: 1 } : {},
    },
    presenceData: {
      totalVisitors: visitors,
      avgDwellMin: presenceAgg._avg.dwellAvgMin ?? dailyScore?.avgDwellMin ?? 0,
      peakHourPeople: peakPeople,
    },
    feedbackStats: {
      totalCount: feedbackAgg._count._all,
      facilityRatio: feedbackAgg._count._all > 0 ? urgentFeedback / feedbackAgg._count._all : 0,
      avgRating: feedbackAgg._avg.rating ?? 5,
      urgentCount: urgentFeedback,
    },
    buildingAssessment: assessment
      ? {
          structuralScore: assessment.structuralScore,
          aestheticScore: assessment.aestheticScore,
          functionalScore: assessment.functionalScore,
          safetyScore: assessment.safetyScore,
          energyScore: assessment.energyScore,
          ecologicalScore: assessment.ecologicalScore,
          issues: jsonArray<{ category: string; severity: string; description: string }>(assessment.issues),
        }
      : null,
    sensorAnomalies,
    conversionRate: visitors > 0 ? orderCount / visitors : null,
    nodeProps: {
      capacity: node.capacity,
      terrainRisk: node.terrainRisk,
      watersideRisk: node.watersideRisk,
      realm: node.realm,
      nodeType: node.nodeType,
      heritageStatus: node.heritageStatus ?? undefined,
      buildingAge: node.buildingAge ?? undefined,
      buildingMaterial: node.buildingMaterial ?? undefined,
    },
  }
}

export async function generateRenovationForNode(nodeId: string, bizDate = getChinaDateString()) {
  const existing = await prisma.spatialDiagnosis.findFirst({
    where: { nodeId, bizDate, status: { in: ["draft", "review", "approved"] } },
    include: { renovationStrategies: true },
    orderBy: { createdAt: "desc" },
  })

  if (existing && existing.renovationStrategies.length > 0) {
    return { diagnosis: existing, strategies: existing.renovationStrategies, created: false }
  }

  const input = await collectRenovationDiagnosisInput(nodeId, bizDate)
  const { rule, ai } = await runFullDiagnosis(input)
  const node = await prisma.spaceNode.findUniqueOrThrow({
    where: { id: nodeId },
    select: { slug: true, realm: true, nodeType: true, buildingMaterial: true },
  })
  const plans = await generateAllRenovationPlans(rule, ai, {
    slug: node.slug,
    realm: node.realm,
    nodeType: node.nodeType,
    buildingMaterial: node.buildingMaterial ?? undefined,
  })

  const diagnosis = await prisma.spatialDiagnosis.create({
    data: {
      nodeId,
      bizDate,
      urgency: ai.overallUrgency,
      issues: toInputJson(rule.issues),
      evidenceJson: toInputJson(rule.evidenceSummary),
      aiSummary: ai.aiSummary,
      energyIssues: toInputJson(rule.energyIssues),
      spatialIssues: toInputJson(rule.spatialIssues),
      ecologicalIssues: toInputJson(rule.ecologicalIssues),
      status: "draft",
    },
  })

  const strategies = []
  for (const plan of plans) {
    strategies.push(
      await prisma.renovationStrategy.create({
        data: {
          nodeId,
          diagnosisId: diagnosis.id,
          category: plan.category,
          title: plan.title,
          description: plan.description,
          dimension: plan.dimension,
          materials: toInputJson(plan.materials),
          techniques: toInputJson(plan.techniques),
          energyConstruction: toInputJson(plan.energyConstruction),
          ecologicalMeasures: toInputJson(plan.ecologicalMeasures),
          interventionType: plan.interventionType,
          oldNewRelationship: plan.oldNewRelationship,
          architecturalForm: toInputJson(plan.architecturalForm),
          buildingProgram: toInputJson(plan.buildingProgram),
          estimatedDuration: plan.estimatedDuration,
          difficultyLevel: plan.difficultyLevel,
          estimatedCostRange: plan.estimatedCostRange,
          expectedImpact: plan.expectedImpact,
          priority: plan.priority,
          status: "draft",
          beforeMetrics: toInputJson(rule.evidenceSummary),
        },
      }),
    )
  }

  return { diagnosis, strategies, created: true }
}

export async function runWeeklyRenovationDiagnosis(bizDate = getChinaDateString()) {
  const nodes = await prisma.spaceNode.findMany({
    where: {
      OR: [
        { buildingAge: { not: null } },
        { buildingMaterial: { not: null } },
        { terrainRisk: { gt: 0.3 } },
        { watersideRisk: { gt: 0.3 } },
      ],
    },
    select: { id: true },
    take: 20,
  })

  const results = []
  for (const node of nodes) {
    results.push(await generateRenovationForNode(node.id, bizDate))
  }

  return { bizDate, nodeCount: nodes.length, results }
}

export async function listRenovationStrategies(limit = 50) {
  return prisma.renovationStrategy.findMany({
    include: {
      node: { select: { id: true, slug: true, nameKey: true, realm: true, nodeType: true } },
      diagnosis: { select: { urgency: true, aiSummary: true, evidenceJson: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
  })
}

export async function getRenovationStrategy(id: string) {
  return prisma.renovationStrategy.findUnique({
    where: { id },
    include: {
      node: true,
      diagnosis: true,
    },
  })
}

export async function listBuildingAssessments(limit = 50) {
  return prisma.buildingAssessment.findMany({
    include: { node: { select: { id: true, slug: true, nameKey: true, realm: true } } },
    orderBy: { assessedAt: "desc" },
    take: limit,
  })
}

export function toBuildingAssessmentData(assessment: Awaited<ReturnType<typeof listBuildingAssessments>>[number]): BuildingAssessmentData {
  return {
    id: assessment.id,
    nodeId: assessment.nodeId,
    assessorId: assessment.assessorId ?? undefined,
    assessedAt: assessment.assessedAt.toISOString(),
    structuralScore: assessment.structuralScore,
    aestheticScore: assessment.aestheticScore,
    functionalScore: assessment.functionalScore,
    safetyScore: assessment.safetyScore,
    energyScore: assessment.energyScore,
    ecologicalScore: assessment.ecologicalScore,
    demolitionRecommendation: assessment.demolitionRecommendation as BuildingAssessmentData["demolitionRecommendation"],
    demolitionReason: assessment.demolitionReason ?? undefined,
    reusePotential: assessment.reusePotential as BuildingAssessmentData["reusePotential"],
    retainedElements: jsonArray(assessment.retainedElements),
    issues: jsonArray(assessment.issues),
    notes: assessment.notes ?? undefined,
    photos: jsonArray(assessment.photos),
    source: assessment.source,
  }
}

function toPublicStrategy(strategy: Awaited<ReturnType<typeof listRenovationStrategies>>[number]): RenovationPublicStrategy {
  return {
    id: strategy.id,
    title: strategy.title,
    description: strategy.description,
    dimension: strategy.dimension as RenovationPublicStrategy["dimension"],
    interventionType: strategy.interventionType as RenovationPublicStrategy["interventionType"],
    priority: strategy.priority as RenovationPublicStrategy["priority"],
    estimatedDuration: strategy.estimatedDuration ?? undefined,
    estimatedCostRange: strategy.estimatedCostRange ?? undefined,
    expectedImpact: strategy.expectedImpact ?? undefined,
  }
}

function toSitePotentialData(site: {
  id: string
  nodeId: string
  locationName: string
  locationLat: number
  locationLng: number
  siteArea: number | null
  currentUse: string | null
  suitabilityScore: number
  accessibilityScore: number
  viewScore: number
  ecologyImpactScore: number
  recommendedProgram: string | null
  recommendedForm: string | null
  recommendedFloors: number | null
  recommendedGFA: number | null
  formKeywords: Prisma.JsonValue
  constraints: Prisma.JsonValue
  rationale: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}): SitePotentialData {
  return {
    id: site.id,
    nodeId: site.nodeId,
    locationName: site.locationName,
    locationLat: site.locationLat,
    locationLng: site.locationLng,
    siteArea: site.siteArea ?? undefined,
    currentUse: site.currentUse ?? undefined,
    suitabilityScore: site.suitabilityScore,
    accessibilityScore: site.accessibilityScore,
    viewScore: site.viewScore,
    ecologyImpactScore: site.ecologyImpactScore,
    recommendedProgram: site.recommendedProgram ?? undefined,
    recommendedForm: site.recommendedForm ?? undefined,
    recommendedFloors: site.recommendedFloors ?? undefined,
    recommendedGFA: site.recommendedGFA ?? undefined,
    formKeywords: jsonArray<string>(site.formKeywords),
    constraints: jsonArray(site.constraints),
    rationale: site.rationale ?? undefined,
    status: site.status,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  }
}

export async function getPublicRenovationNodes(): Promise<RenovationPublicNode[]> {
  const nodes = await prisma.spaceNode.findMany({
    where: {
      OR: [{ renovationStrategies: { some: {} } }, { diagnoses: { some: {} } }, { sitePotentials: { some: {} } }],
    },
    include: {
      diagnoses: { orderBy: { createdAt: "desc" }, take: 1 },
      renovationStrategies: { orderBy: [{ priority: "asc" }, { createdAt: "desc" }], take: 3 },
      sitePotentials: { orderBy: { suitabilityScore: "desc" }, take: 2 },
    },
    orderBy: { slug: "asc" },
    take: 20,
  })

  return nodes.map((node) => {
    const diagnosis = node.diagnoses[0]
    return {
      nodeId: node.id,
      slug: node.slug,
      nameKey: node.nameKey,
      realm: node.realm,
      nodeType: node.nodeType,
      building: {
        age: node.buildingAge ?? undefined,
        material: node.buildingMaterial ?? undefined,
        floors: node.buildingFloors ?? undefined,
        area: node.buildingArea ?? undefined,
        structuralCondition: node.structuralCondition as RenovationPublicNode["building"] extends infer Building ? Building extends { structuralCondition?: infer Condition } ? Condition : never : never,
        energyScore: node.energyScore ?? undefined,
        heritageStatus: node.heritageStatus ?? undefined,
      },
      diagnosis: diagnosis
        ? {
            id: diagnosis.id,
            urgency: diagnosis.urgency as RenovationPublicNode["diagnosis"] extends infer Diagnosis ? Diagnosis extends { urgency: infer Urgency } ? Urgency : never : never,
            aiSummary: diagnosis.aiSummary ?? undefined,
            issues: jsonArray<DiagnosisIssue>(diagnosis.issues),
            evidenceJson: jsonObject(diagnosis.evidenceJson, {
              crowdStress: 0,
              feedbackRatio: 0,
              safetyScore: 0,
              energyScore: 0,
              ecologicalScore: 0,
              conversionRate: null,
              sensorAnomalies: [],
              recentAlerts: 0,
            }),
          }
        : undefined,
      strategies: node.renovationStrategies.map((strategy) => ({
        id: strategy.id,
        title: strategy.title,
        description: strategy.description,
        dimension: strategy.dimension as RenovationPublicStrategy["dimension"],
        interventionType: strategy.interventionType as RenovationPublicStrategy["interventionType"],
        priority: strategy.priority as RenovationPublicStrategy["priority"],
        estimatedDuration: strategy.estimatedDuration ?? undefined,
        estimatedCostRange: strategy.estimatedCostRange ?? undefined,
        expectedImpact: strategy.expectedImpact ?? undefined,
      })),
      sitePotentials: node.sitePotentials.map(toSitePotentialData),
    }
  })
}
