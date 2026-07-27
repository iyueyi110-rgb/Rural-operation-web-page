import "server-only"

import type { DiagnosisUrgency, RenovationDimension } from "@zouma/contracts"

export interface DiagnosisInput {
  nodeId: string
  dailyScores: {
    avgAttractiveness: number
    avgSafetyRisk: number
    peakVisitorDensity: number
    weatherDays: Record<string, number>
  }
  presenceData: {
    totalVisitors: number
    avgDwellMin: number
    peakHourPeople: number
  }
  feedbackStats: {
    totalCount: number
    facilityRatio: number
    avgRating: number
    urgentCount: number
  }
  buildingAssessment: {
    structuralScore: number
    aestheticScore: number
    functionalScore: number
    safetyScore: number
    energyScore: number
    ecologicalScore: number
    issues: Array<{ category: string; severity: string; description: string }>
  } | null
  sensorAnomalies: string[]
  conversionRate: number | null
  nodeProps: {
    capacity: number
    terrainRisk: number
    watersideRisk: number
    realm: string
    nodeType: string
    heritageStatus?: string
    buildingAge?: number
    buildingMaterial?: string
  }
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

export interface DiagnosisEvidenceSummary {
  crowdStress: number
  feedbackRatio: number
  safetyScore: number
  energyScore: number
  ecologicalScore: number
  conversionRate: number | null
  sensorAnomalies: string[]
  recentAlerts: number
}

export interface DiagnosisResult {
  nodeId: string
  urgency: DiagnosisUrgency
  issues: DiagnosisIssue[]
  energyIssues: DiagnosisIssue[]
  spatialIssues: DiagnosisIssue[]
  ecologicalIssues: DiagnosisIssue[]
  evidenceSummary: DiagnosisEvidenceSummary
}

function assessUrgency(issues: DiagnosisIssue[]): DiagnosisUrgency {
  if (issues.some((issue) => issue.severity === "critical")) return "critical"
  if (issues.filter((issue) => issue.severity === "major").length >= 2) return "high"
  if (issues.some((issue) => issue.severity === "major")) return "medium"
  return issues.length > 0 ? "low" : "low"
}

function isTraditionalMaterial(material?: string) {
  return Boolean(material && ["砖木", "夯土", "石砌", "木结构", "砖混"].includes(material))
}

function diagnoseEnergy(input: DiagnosisInput): DiagnosisIssue[] {
  const issues: DiagnosisIssue[] = []
  const assessment = input.buildingAssessment

  if (assessment && assessment.energyScore <= 2) {
    issues.push({
      code: "E1_LOW_ENERGY_SCORE",
      title: "建筑节能性能不足",
      description: `节能评分为 ${assessment.energyScore}/5，围护结构、门窗或通风系统存在明显提升空间。`,
      severity: assessment.energyScore <= 1 ? "critical" : "major",
      dimension: "energy",
      evidenceKeys: ["energyScore"],
      suggestedActions: ["围护结构保温改造", "节能门窗更新", "屋面隔热与自然通风优化"],
    })
  }

  if ((input.nodeProps.buildingAge ?? 0) > 20 && isTraditionalMaterial(input.nodeProps.buildingMaterial)) {
    issues.push({
      code: "E2_AGING_THERMAL_ENVELOPE",
      title: "老旧围护结构热工性能弱",
      description: `建筑使用约 ${input.nodeProps.buildingAge} 年，${input.nodeProps.buildingMaterial} 构造缺少现代保温隔热层。`,
      severity: "major",
      dimension: "energy",
      evidenceKeys: ["buildingAge", "buildingMaterial"],
      suggestedActions: ["优先采用不破坏风貌的内保温", "坡屋顶增加通风隔热层", "地面防潮保温处理"],
    })
  }

  if (input.sensorAnomalies.some((item) => item.includes("temperature_high") || item.includes("humidity_high"))) {
    issues.push({
      code: "E3_MICROCLIMATE_STRESS",
      title: "室内微气候压力偏高",
      description: "传感器显示高温或高湿异常，需要补充遮阳、通风或被动降温措施。",
      severity: "major",
      dimension: "energy",
      evidenceKeys: ["sensorAnomalies"],
      suggestedActions: ["增加可调节遮阳", "增强穿堂风", "引入太阳能烟囱或地道风等被动策略"],
    })
  }

  return issues
}

function diagnoseSpatial(input: DiagnosisInput): DiagnosisIssue[] {
  const issues: DiagnosisIssue[] = []
  const assessment = input.buildingAssessment
  const density = input.presenceData.peakHourPeople / Math.max(input.nodeProps.capacity, 1)

  if (density > 0.8) {
    issues.push({
      code: "S1_OVERCROWDING",
      title: "高峰空间承载接近或超过上限",
      description: `高峰承载率约 ${(density * 100).toFixed(0)}%，需要扩容、分流或调整预约节奏。`,
      severity: density > 1.2 ? "critical" : "major",
      dimension: "spatial",
      evidenceKeys: ["peakHourPeople", "capacity"],
      suggestedActions: ["优化动线瓶颈", "增加等候与缓冲空间", "设置分时预约或邻近分流点"],
    })
  }

  if (assessment && assessment.functionalScore <= 2 && input.conversionRate !== null && input.conversionRate < 0.05) {
    issues.push({
      code: "S2_LOW_FUNCTIONAL_EFFICIENCY",
      title: "功能效率与转化率偏低",
      description: `功能评分 ${assessment.functionalScore}/5，消费转化率低于 5%，空间组织不利于运营。`,
      severity: "major",
      dimension: "spatial",
      evidenceKeys: ["functionalScore", "conversionRate"],
      suggestedActions: ["重组功能分区", "改善展示与消费动线", "增加弹性复合空间"],
    })
  }

  if (assessment && assessment.structuralScore <= 2) {
    issues.push({
      code: "S3_STRUCTURAL_CONCERN",
      title: "结构状况需要重点复核",
      description: `结构评分 ${assessment.structuralScore}/5，应先完成结构安全鉴定再进入施工设计。`,
      severity: assessment.structuralScore <= 1 ? "critical" : "major",
      dimension: "spatial",
      evidenceKeys: ["structuralScore", "safetyScore"],
      suggestedActions: ["专业结构鉴定", "局部支护与加固", "限制高风险区域使用"],
    })
  }

  if (input.nodeProps.watersideRisk > 0.5) {
    issues.push({
      code: "S4_WATERSIDE_SAFETY",
      title: "滨水空间安全风险偏高",
      description: `近水风险指数 ${input.nodeProps.watersideRisk.toFixed(2)}，需要强化防护、照明与防滑。`,
      severity: "major",
      dimension: "spatial",
      evidenceKeys: ["watersideRisk"],
      suggestedActions: ["补充安全栏杆", "地面防滑处理", "设置夜间警示照明和救生点"],
    })
  }

  if (input.presenceData.avgDwellMin < 10 && input.presenceData.totalVisitors > 100) {
    issues.push({
      code: "S5_LOW_DWELL_TIME",
      title: "游客停留时间偏短",
      description: `平均停留约 ${input.presenceData.avgDwellMin.toFixed(0)} 分钟，缺少舒适驻留点。`,
      severity: "minor",
      dimension: "spatial",
      evidenceKeys: ["avgDwellMin", "totalVisitors"],
      suggestedActions: ["增加休憩座椅", "补足遮阳避雨廊道", "设置小型互动或展示节点"],
    })
  }

  return issues
}

function diagnoseDemolitionAndNewBuild(input: DiagnosisInput): DiagnosisIssue[] {
  const assessment = input.buildingAssessment
  const issues: DiagnosisIssue[] = []

  if (assessment && assessment.structuralScore <= 1 && assessment.safetyScore <= 1) {
    issues.push({
      code: "D1_STRUCTURAL_FAILURE",
      title: "结构严重损坏，建议整体拆除重建评估",
      description: "结构与安全评分均处于最低档，修复经济性和施工安全性需要与重建方案比选。",
      severity: "critical",
      dimension: "spatial",
      evidenceKeys: ["structuralScore", "safetyScore"],
      suggestedActions: ["结构安全鉴定", "筛选可保留构件", "编制拆除与原址新建任务书"],
    })
  }

  if (
    assessment &&
    assessment.aestheticScore <= 2 &&
    assessment.functionalScore <= 2 &&
    !["历史建筑", "文物保护单位", "不可移动文物"].includes(input.nodeProps.heritageStatus ?? "")
  ) {
    issues.push({
      code: "D2_LOW_VALUE_REDEVELOP",
      title: "风貌与功能双低，适合部分拆除与新旧结合",
      description: "现状风貌和功能价值不足，可保留有记忆点的构件后植入轻量新体量。",
      severity: "major",
      dimension: "spatial",
      evidenceKeys: ["aestheticScore", "functionalScore", "heritageStatus"],
      suggestedActions: ["测绘保留元素", "拆除低价值加建", "以钢木轻结构植入新功能"],
    })
  }

  if (assessment && assessment.energyScore <= 1 && (input.nodeProps.buildingAge ?? 0) > 50) {
    issues.push({
      code: "D3_UNECONOMIC_RETROFIT",
      title: "节能改造经济性需与重建比选",
      description: "建筑年代久且节能评分极低，深度节能改造可能接近重建成本。",
      severity: "major",
      dimension: "energy",
      evidenceKeys: ["energyScore", "buildingAge"],
      suggestedActions: ["测算改造/新建造价比", "评估保留构件价值", "重建方案采用被动式节能策略"],
    })
  }

  if (input.dailyScores.peakVisitorDensity > 1) {
    issues.push({
      code: "N1_CAPACITY_OVERFLOW",
      title: "现有空间超载，需要邻近新建分流",
      description: `峰值密度 ${(input.dailyScores.peakVisitorDensity * 100).toFixed(0)}%，现有节点难以单靠内部改造消化。`,
      severity: "critical",
      dimension: "spatial",
      evidenceKeys: ["peakVisitorDensity"],
      suggestedActions: ["50 米范围内筛选补充建设点", "新建休憩/卫生/展示分流功能", "以连廊或路径连接原节点"],
    })
  }

  if (assessment && assessment.functionalScore <= 2 && input.presenceData.avgDwellMin > 30) {
    issues.push({
      code: "N2_MISSING_PROGRAM",
      title: "停留需求强但功能配套不足",
      description: "游客愿意停留，但现有建筑功能承接不足，适合补充新建或扩建配套空间。",
      severity: "major",
      dimension: "spatial",
      evidenceKeys: ["functionalScore", "avgDwellMin"],
      suggestedActions: ["补充公共客厅/茶歇/展陈空间", "设置轻量附属建筑", "建立新旧空间过渡界面"],
    })
  }

  return issues
}

function diagnoseEcological(input: DiagnosisInput): DiagnosisIssue[] {
  const assessment = input.buildingAssessment
  const issues: DiagnosisIssue[] = []

  if (assessment && assessment.ecologicalScore <= 2) {
    issues.push({
      code: "G1_LOW_ECOLOGICAL_SCORE",
      title: "生态品质评分偏低",
      description: `生态评分 ${assessment.ecologicalScore}/5，需补足绿化、水循环和生境营造。`,
      severity: assessment.ecologicalScore <= 1 ? "major" : "minor",
      dimension: "ecological",
      evidenceKeys: ["ecologicalScore"],
      suggestedActions: ["建设雨水花园", "补充乡土植物群落", "提升铺装透水率"],
    })
  }

  if (input.sensorAnomalies.some((item) => item.includes("soil_dry") || item.includes("water_low"))) {
    issues.push({
      code: "G2_WATER_STRESS",
      title: "水环境或土壤湿度异常",
      description: "传感器显示土壤或水位异常，需增强雨水收集、渗透和慢排能力。",
      severity: "major",
      dimension: "ecological",
      evidenceKeys: ["sensorAnomalies"],
      suggestedActions: ["设置渗沟和蓄水池", "恢复透水地表", "布置耐旱乡土植物"],
    })
  }

  if (input.nodeProps.terrainRisk > 0.5) {
    issues.push({
      code: "G3_SLOPE_EROSION",
      title: "坡地水土流失风险偏高",
      description: `地形风险指数 ${input.nodeProps.terrainRisk.toFixed(2)}，需要生态护坡和径流组织。`,
      severity: "major",
      dimension: "ecological",
      evidenceKeys: ["terrainRisk"],
      suggestedActions: ["生态护坡", "分级截排水", "植被固土"],
    })
  }

  return issues
}

export function diagnoseNode(input: DiagnosisInput): DiagnosisResult {
  const issues = [
    ...diagnoseEnergy(input),
    ...diagnoseSpatial(input),
    ...diagnoseDemolitionAndNewBuild(input),
    ...diagnoseEcological(input),
  ]
  const energyIssues = issues.filter((issue) => issue.dimension === "energy")
  const spatialIssues = issues.filter((issue) => issue.dimension === "spatial")
  const ecologicalIssues = issues.filter((issue) => issue.dimension === "ecological")

  return {
    nodeId: input.nodeId,
    urgency: assessUrgency(issues),
    issues,
    energyIssues,
    spatialIssues,
    ecologicalIssues,
    evidenceSummary: {
      crowdStress: input.presenceData.peakHourPeople / Math.max(input.nodeProps.capacity, 1),
      feedbackRatio: input.feedbackStats.totalCount > 0 ? input.feedbackStats.facilityRatio : 0,
      safetyScore: input.buildingAssessment?.safetyScore ?? Math.max(0, 5 - input.dailyScores.avgSafetyRisk),
      energyScore: input.buildingAssessment?.energyScore ?? 3,
      ecologicalScore: input.buildingAssessment?.ecologicalScore ?? 3,
      conversionRate: input.conversionRate,
      sensorAnomalies: input.sensorAnomalies,
      recentAlerts: input.feedbackStats.urgentCount,
    },
  }
}
