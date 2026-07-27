export interface ImpactInput {
  before: {
    avgDailyVisitors: number
    avgDwellMin: number
    avgSatisfaction: number
    safetyRiskScore: number
    energyScore: number
    conversionRate: number | null
    spatialFeedbackCount: number
  }
  after: {
    avgDailyVisitors: number
    avgDwellMin: number
    avgSatisfaction: number
    safetyRiskScore: number
    energyScore: number
    conversionRate: number | null
    spatialFeedbackCount: number
  }
}

export interface ImpactReport {
  visitorChange: number
  dwellChange: number
  satisfactionChange: number
  safetyRiskChange: number
  energyScoreChange: number
  conversionRateChange: number
  feedbackReduction: number
  verdict: "significantly_improved" | "improved" | "no_change" | "degraded"
  summary: string
}

function pctChange(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0
  return Math.round(((after - before) / before) * 100 * 100) / 100
}

export function computeRenovationImpact(input: ImpactInput): ImpactReport {
  const { before, after } = input

  const visitorChange = pctChange(before.avgDailyVisitors, after.avgDailyVisitors)
  const dwellChange = pctChange(before.avgDwellMin, after.avgDwellMin)
  const satisfactionChange = pctChange(before.avgSatisfaction, after.avgSatisfaction)
  const safetyRiskChange = pctChange(before.safetyRiskScore, after.safetyRiskScore)
  const energyScoreChange = pctChange(before.energyScore, after.energyScore)
  const feedbackReduction = pctChange(before.spatialFeedbackCount, after.spatialFeedbackCount)
  const conversionRateChange =
    before.conversionRate !== null && after.conversionRate !== null
      ? pctChange(before.conversionRate, after.conversionRate)
      : 0

  const positiveScore =
    (visitorChange > 0 ? 1 : 0) +
    (dwellChange > 0 ? 1 : 0) +
    (satisfactionChange > 0 ? 1 : 0) +
    (energyScoreChange > 0 ? 1 : 0) +
    (conversionRateChange > 0 ? 1 : 0)
  const negativeScore = (safetyRiskChange < 0 ? 1 : 0) + (feedbackReduction < 0 ? 1 : 0)
  const totalScore = positiveScore + negativeScore

  let verdict: ImpactReport["verdict"] = "no_change"
  if (totalScore >= 5) verdict = "significantly_improved"
  else if (totalScore >= 3) verdict = "improved"
  else if (totalScore <= 1) verdict = "degraded"

  const summary =
    verdict === "significantly_improved"
      ? `改造效果显著：${totalScore}/7项指标改善。`
      : verdict === "improved"
        ? `改造有效果：${totalScore}/7项指标改善。`
        : verdict === "degraded"
          ? "改造后部分指标恶化，需排查原因。"
          : "改造前后变化不显著，建议延长观察期。"

  return {
    visitorChange,
    dwellChange,
    satisfactionChange,
    safetyRiskChange,
    energyScoreChange,
    conversionRateChange,
    feedbackReduction,
    verdict,
    summary,
  }
}
