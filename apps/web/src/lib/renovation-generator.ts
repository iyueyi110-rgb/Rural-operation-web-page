import "server-only"

import type {
  ArchitecturalForm,
  BuildingProgramItem,
  EcologicalMeasure,
  EnergyConstructionDetail,
  RenovationMaterial,
  RenovationStrategyData,
  RenovationTechnique,
} from "@zouma/contracts"
import { ModelProviderAdapter, matchStrategies, type DiagnosisResult, type StrategyTemplate } from "@zouma/utils"

import { isPlainObject } from "@web/lib/aigc-api"
import { extractJsonContent } from "@web/lib/ai-json"
import type { AiDiagnosisEnhancement } from "@web/lib/diagnosis-generator"

const RENOVATION_SYSTEM_PROMPT = `你是走马村乡村建筑改造专家，专精传统民居节能改造、空间优化、生态修复、拆除重建和新旧结合设计。
基于诊断和策略模板生成定制方案。严格返回 JSON，不要 Markdown：
{
  "title": "方案标题",
  "description": "200字以内方案概述",
  "oldNewRelationship": "新旧关系描述",
  "estimatedDuration": "预估工期",
  "difficultyLevel": "easy|medium|hard",
  "estimatedCostRange": "预估造价范围",
  "expectedImpact": "预期效果",
  "priority": "critical|high|medium|low"
}`

export interface GeneratedRenovationPlan {
  title: string
  description: string
  category: RenovationStrategyData["category"]
  dimension: RenovationStrategyData["dimension"]
  interventionType: NonNullable<RenovationStrategyData["interventionType"]>
  oldNewRelationship: string
  materials: RenovationMaterial[]
  techniques: RenovationTechnique[]
  energyConstruction: EnergyConstructionDetail[]
  ecologicalMeasures: EcologicalMeasure[]
  architecturalForm: ArchitecturalForm
  buildingProgram: BuildingProgramItem[]
  estimatedDuration: string
  difficultyLevel: string
  estimatedCostRange: string
  expectedImpact: string
  priority: RenovationStrategyData["priority"]
}

function priorityFromUrgency(urgency: DiagnosisResult["urgency"]): RenovationStrategyData["priority"] {
  if (urgency === "critical") return "critical"
  if (urgency === "high") return "high"
  if (urgency === "low") return "low"
  return "medium"
}

function templateToPlan(template: StrategyTemplate, urgency: DiagnosisResult["urgency"]): GeneratedRenovationPlan {
  return {
    title: template.title,
    description: template.description,
    category: template.category,
    dimension: template.dimension,
    interventionType: template.interventionType,
    oldNewRelationship: template.oldNewRelationship,
    materials: template.materials,
    techniques: template.techniques,
    energyConstruction: template.energyConstruction,
    ecologicalMeasures: template.ecologicalMeasures,
    architecturalForm: template.architecturalForm,
    buildingProgram: template.buildingProgram,
    estimatedDuration: template.estimatedDuration,
    difficultyLevel: template.difficultyLevel,
    estimatedCostRange: template.estimatedCostRange,
    expectedImpact: template.expectedImpact,
    priority: priorityFromUrgency(urgency),
  }
}

function createFallbackPlan(diagnosis: DiagnosisResult, nodeContext: RenovationNodeContext): GeneratedRenovationPlan {
  return {
    title: `${nodeContext.slug} 综合空间品质提升方案`,
    description: `基于系统诊断发现 ${diagnosis.issues.length} 个问题，建议以低扰动方式同步提升节能、空间和生态品质。`,
    category: "spatial_reorganization",
    dimension: "spatial",
    interventionType: "renovation",
    oldNewRelationship: "保留原有建筑主体，优先进行功能优化、节能补强和场地生态化。",
    materials: [],
    techniques: [],
    energyConstruction: [],
    ecologicalMeasures: [],
    architecturalForm: {
      formLanguage: "综合提升",
      massingStrategy: "维持原有体量",
      materialPalette: [],
      roofType: "保留",
      elevationStrategy: "保留并修补",
      relationshipToGround: "维持现状并优化排水",
      referenceImages: [],
    },
    buildingProgram: [],
    estimatedDuration: "待现场复核",
    difficultyLevel: "medium",
    estimatedCostRange: "待估算",
    expectedImpact: "提升空间品质、运营效率和安全性。",
    priority: priorityFromUrgency(diagnosis.urgency),
  }
}

function applyAiCustomization(base: GeneratedRenovationPlan, value: unknown): GeneratedRenovationPlan {
  if (!isPlainObject(value)) return base
  const priority = value.priority

  return {
    ...base,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : base.title,
    description: typeof value.description === "string" && value.description.trim() ? value.description.trim() : base.description,
    oldNewRelationship:
      typeof value.oldNewRelationship === "string" && value.oldNewRelationship.trim()
        ? value.oldNewRelationship.trim()
        : base.oldNewRelationship,
    estimatedDuration:
      typeof value.estimatedDuration === "string" && value.estimatedDuration.trim()
        ? value.estimatedDuration.trim()
        : base.estimatedDuration,
    difficultyLevel:
      typeof value.difficultyLevel === "string" && value.difficultyLevel.trim()
        ? value.difficultyLevel.trim()
        : base.difficultyLevel,
    estimatedCostRange:
      typeof value.estimatedCostRange === "string" && value.estimatedCostRange.trim()
        ? value.estimatedCostRange.trim()
        : base.estimatedCostRange,
    expectedImpact:
      typeof value.expectedImpact === "string" && value.expectedImpact.trim()
        ? value.expectedImpact.trim()
        : base.expectedImpact,
    priority:
      priority === "critical" || priority === "high" || priority === "medium" || priority === "low"
        ? priority
        : base.priority,
  }
}

export interface RenovationNodeContext {
  slug: string
  realm: string
  nodeType: string
  buildingMaterial?: string
}

export async function generateRenovationPlan(
  diagnosis: DiagnosisResult,
  aiEnhancement: AiDiagnosisEnhancement,
  nodeContext: RenovationNodeContext,
  template?: StrategyTemplate,
): Promise<GeneratedRenovationPlan> {
  const matchedStrategies = template ? [template] : matchStrategies(diagnosis.issues.map((issue) => issue.code))
  const primaryStrategy = matchedStrategies[0]
  const fallback = primaryStrategy ? templateToPlan(primaryStrategy, diagnosis.urgency) : createFallbackPlan(diagnosis, nodeContext)

  if (!primaryStrategy) return fallback

  const context = {
    node: nodeContext,
    diagnosis: {
      urgency: diagnosis.urgency,
      issues: diagnosis.issues.slice(0, 5).map((issue) => ({
        code: issue.code,
        title: issue.title,
        severity: issue.severity,
        dimension: issue.dimension,
      })),
    },
    aiFindings: aiEnhancement.keyFindings.slice(0, 3),
    template: {
      code: primaryStrategy.code,
      title: primaryStrategy.title,
      interventionType: primaryStrategy.interventionType,
      description: primaryStrategy.description,
      oldNewRelationship: primaryStrategy.oldNewRelationship,
      estimatedDuration: primaryStrategy.estimatedDuration,
      estimatedCostRange: primaryStrategy.estimatedCostRange,
    },
  }

  try {
    const result = await ModelProviderAdapter.complete(JSON.stringify(context), {
      systemPrompt: RENOVATION_SYSTEM_PROMPT,
      temperature: 0.35,
      timeout: 30_000,
    })
    if (!result.content.trim()) return fallback

    return applyAiCustomization(fallback, extractJsonContent(result.content))
  } catch (error) {
    console.error("Renovation plan AI generation failed, using template fallback:", error)
    return fallback
  }
}

export async function generateAllRenovationPlans(
  diagnosis: DiagnosisResult,
  aiEnhancement: AiDiagnosisEnhancement,
  nodeContext: RenovationNodeContext,
): Promise<GeneratedRenovationPlan[]> {
  const matchedStrategies = matchStrategies(diagnosis.issues.map((issue) => issue.code))
  if (matchedStrategies.length === 0) return [createFallbackPlan(diagnosis, nodeContext)]

  const plans: GeneratedRenovationPlan[] = []
  for (const template of matchedStrategies.slice(0, 3)) {
    plans.push(await generateRenovationPlan(diagnosis, aiEnhancement, nodeContext, template))
  }

  return plans
}
