import "server-only"

import { ModelProviderAdapter, diagnoseNode, type DiagnosisInput, type DiagnosisResult } from "@zouma/utils"

import { isPlainObject } from "@web/lib/aigc-api"
import { extractJsonContent } from "@web/lib/ai-json"

const DIAGNOSIS_SYSTEM_PROMPT = `你是走马村乡村建筑空间诊断专家。根据规则诊断、建筑评估、客流、反馈和传感器证据，生成中文空间诊断增强摘要。
严格返回 JSON，不要 Markdown：
{
  "aiSummary": "200字以内综合诊断总结",
  "overallUrgency": "critical|high|medium|low",
  "keyFindings": [
    {
      "dimension": "energy|spatial|ecological",
      "finding": "发现描述",
      "severity": "critical|major|minor",
      "recommendation": "针对性建议"
    }
  ],
  "priorityOrder": ["issue code"]
}`

export interface AiDiagnosisEnhancement {
  aiSummary: string
  overallUrgency: DiagnosisResult["urgency"]
  keyFindings: Array<{
    dimension: "energy" | "spatial" | "ecological"
    finding: string
    severity: "critical" | "major" | "minor"
    recommendation: string
  }>
  priorityOrder: string[]
}

function fallbackDiagnosisEnhancement(ruleDiagnosis: DiagnosisResult): AiDiagnosisEnhancement {
  return {
    aiSummary: `基于规则引擎诊断：发现 ${ruleDiagnosis.issues.length} 个空间问题，其中节能 ${ruleDiagnosis.energyIssues.length} 个、空间 ${ruleDiagnosis.spatialIssues.length} 个、生态 ${ruleDiagnosis.ecologicalIssues.length} 个，整体紧急度为 ${ruleDiagnosis.urgency}。`,
    overallUrgency: ruleDiagnosis.urgency,
    keyFindings: ruleDiagnosis.issues.slice(0, 5).map((issue) => ({
      dimension: issue.dimension,
      finding: issue.title,
      severity: issue.severity,
      recommendation: issue.suggestedActions[0] ?? "补充现场复核后制定改造方案。",
    })),
    priorityOrder: ruleDiagnosis.issues.map((issue) => issue.code),
  }
}

function normalizeAiDiagnosis(value: unknown, fallback: AiDiagnosisEnhancement): AiDiagnosisEnhancement {
  if (!isPlainObject(value)) return fallback

  const urgency = value.overallUrgency
  const overallUrgency =
    urgency === "critical" || urgency === "high" || urgency === "medium" || urgency === "low"
      ? urgency
      : fallback.overallUrgency
  const keyFindings = Array.isArray(value.keyFindings) ? value.keyFindings.filter(isPlainObject) : []
  const priorityOrder = Array.isArray(value.priorityOrder)
    ? value.priorityOrder.filter((item): item is string => typeof item === "string")
    : fallback.priorityOrder

  return {
    aiSummary: typeof value.aiSummary === "string" && value.aiSummary.trim() ? value.aiSummary.trim() : fallback.aiSummary,
    overallUrgency,
    keyFindings: keyFindings.slice(0, 5).map((item, index) => {
      const dimension = item.dimension === "energy" || item.dimension === "spatial" || item.dimension === "ecological" ? item.dimension : fallback.keyFindings[index]?.dimension ?? "spatial"
      const severity = item.severity === "critical" || item.severity === "major" || item.severity === "minor" ? item.severity : fallback.keyFindings[index]?.severity ?? "minor"

      return {
        dimension,
        finding: typeof item.finding === "string" && item.finding ? item.finding : fallback.keyFindings[index]?.finding ?? "发现待复核的空间问题",
        severity,
        recommendation:
          typeof item.recommendation === "string" && item.recommendation
            ? item.recommendation
            : fallback.keyFindings[index]?.recommendation ?? "补充现场复核后制定改造方案。",
      }
    }),
    priorityOrder,
  }
}

export async function enhanceDiagnosisWithAI(ruleDiagnosis: DiagnosisResult, input: DiagnosisInput): Promise<AiDiagnosisEnhancement> {
  const fallback = fallbackDiagnosisEnhancement(ruleDiagnosis)
  const context = {
    nodeId: input.nodeId,
    nodeProps: input.nodeProps,
    ruleDiagnosis: {
      urgency: ruleDiagnosis.urgency,
      issues: ruleDiagnosis.issues.map((issue) => ({
        code: issue.code,
        title: issue.title,
        severity: issue.severity,
        dimension: issue.dimension,
      })),
    },
    evidence: ruleDiagnosis.evidenceSummary,
    buildingAssessment: input.buildingAssessment,
    feedbackStats: input.feedbackStats,
    sensorAnomalies: input.sensorAnomalies,
  }

  try {
    const result = await ModelProviderAdapter.complete(JSON.stringify(context), {
      systemPrompt: DIAGNOSIS_SYSTEM_PROMPT,
      temperature: 0.25,
      timeout: 30_000,
    })
    if (!result.content.trim()) return fallback

    return normalizeAiDiagnosis(extractJsonContent(result.content), fallback)
  } catch (error) {
    console.error("Renovation diagnosis AI enhancement failed, using fallback:", error)
    return fallback
  }
}

export async function runFullDiagnosis(input: DiagnosisInput): Promise<{
  rule: DiagnosisResult
  ai: AiDiagnosisEnhancement
}> {
  const rule = diagnoseNode(input)
  const ai = await enhanceDiagnosisWithAI(rule, input)
  return { rule, ai }
}
