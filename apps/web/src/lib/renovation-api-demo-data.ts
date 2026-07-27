import { DEMO_NODES } from "@web/lib/renovation-demo-data"

const createdAt = "2026-07-01T09:00:00.000+08:00"

const detailBySlug = {
  "ancient-road": {
    architecturalForm: ["传统驿亭低扰动修缮", "延续一层坡屋顶体量", "小青瓦坡屋面加隔热层", "保留木柱和灰砖立面"],
    programs: [["短停休憩", "32m²", "16 人", "配置长凳、遮雨檐和导览牌"], ["导览展示", "18m²", "12 人", "墙面展示古道路线与风险提示"]],
    energy: [["屋面隔热", "竹木基层加薄型隔热板", "不改变屋面外观，降低热辐射。", "15-22%"]],
    ecology: [["雨水整理", "透水石铺和边沟清理", "减少入口积水，保护古道肌理。", "提升雨天通行安全"]],
  },
  "lychee-garden": {
    architecturalForm: ["田园工坊复合更新", "一层开敞式加工展陈体量", "半透明遮阳棚与排水檐沟", "砖墙、竹帘和可开启窗扇组合"],
    programs: [["加工操作", "46m²", "18 人", "靠近水电点位，配置可清洗操作台"], ["体验课堂", "42m²", "20 人", "可与展陈区合并举办课程"]],
    energy: [["遮阳通风", "可开启高窗和竹帘遮阳", "降低湿热天气下的体感闷热。", "8-15%"]],
    ecology: [["雨水花园", "林缘浅沟雨水花园", "消纳棚面雨水并改善工坊微气候。", "提升渗透和微生境"]],
  },
  "waterfront-rest": {
    architecturalForm: ["滨水低干预景观修复", "顺岸线展开的线性平台", "防滑木平台与局部雨棚", "石阶、木栏杆和草本护坡过渡"],
    programs: [["安全观景", "52m²", "30 人", "栏杆连续高度不低于 1.1m"], ["生态缓冲", "120m", "岸线", "采用本地草本、卵石和渗透基质"]],
    energy: [["低能耗照明", "太阳能低位导视灯", "减少夜间运营用电。", "10-18%"]],
    ecology: [["生态护坡", "卵石滞留带和挺水植物", "削减径流冲刷，恢复河岸缓冲。", "提升水岸生境"]],
  },
  "ridge-courtyard": {
    architecturalForm: ["夯土合院保护性更新", "围合院落与低矮厢房", "小青瓦屋面加隔热层", "夯土墙、木窗和局部灰砖修补"],
    programs: [["共享厅堂", "58m²", "26 人", "保持面向院落的开敞关系"], ["民宿客房", "72m²", "8 人", "内侧保温不破坏外墙肌理"]],
    energy: [["内侧保温", "透气型保温砂浆", "避免外立面改变，提升冬季室温。", "18-28%"]],
    ecology: [["雨水收集", "檐沟和雨水桶整理", "减少院落冲刷并补充浇灌用水。", "降低径流外排"]],
  },
  "village-meal": {
    architecturalForm: ["粮仓外壳与轻钢新构嵌合", "保留石墙围合，内部二次结构独立受力", "半透明轻屋面与原墙脱开", "石砌墙面、木门和黑色钢构形成新旧对比"],
    programs: [["展售茶歇", "64m²", "32 人", "提供茶歇、农产品展示和收银"], ["后场备餐", "28m²", "6 人", "靠近服务入口，保留排烟和清洗条件"], ["记忆展廊", "22m²", "18 人", "利用保留石墙和谷仓门讲述粮仓故事"]],
    energy: [["屋面更新", "轻质隔热屋面和高侧窗", "改善闲置粮仓热舒适和采光。", "12-20%"]],
    ecology: [["透水庭院", "拆除硬化地面后改为透水铺装", "恢复雨水下渗并降低庭院积水。", "减少径流外排"]],
  },
  "tree-adoption": {
    architecturalForm: ["林下低矮轻建筑", "单层架空平台，避让树冠和根系", "轻质透明顶棚和可拆竹木屏风", "木构、竹编和少量金属连接件"],
    programs: [["林下休憩", "48m²", "24 人", "面向认养树和采摘动线"], ["工具借还", "12m²", "运营", "集中存放采摘篮、雨具和清洁工具"]],
    energy: [["自然遮阴", "树冠遮阴和可开启顶棚", "减少机电依赖，提升林下舒适度。", "6-10%"]],
    ecology: [["架空基础", "点式基础避让根系", "减少对荔枝树根和地表径流的扰动。", "保护林下生态"]],
  },
} as const

const slugAlias: Record<string, keyof typeof detailBySlug> = {
  "ancient-road-pavilion": "ancient-road",
  "lychee-workshop": "lychee-garden",
  "longxi-riverbank": "waterfront-rest",
  "abandoned-granary": "village-meal",
  "lychee-forest-clearance": "tree-adoption",
}

export function demoApiStrategies() {
  return DEMO_NODES.flatMap((node) =>
    node.strategies.map((strategy) => ({
      ...strategy,
      id: normalizeStrategyId(strategy.id, node.slug),
      nodeId: node.nodeId,
      status: strategy.priority === "critical" ? "approved" : strategy.priority === "medium" ? "in_progress" : "approved",
      createdAt,
      node: { id: node.nodeId, slug: publicSlugToBackendSlug(node.slug), nameKey: node.nameKey, realm: node.realm, nodeType: node.nodeType },
      diagnosis: node.diagnosis ? { urgency: node.diagnosis.urgency, aiSummary: node.diagnosis.aiSummary, evidenceJson: node.diagnosis.evidenceJson } : null,
    })),
  )
}

export function demoApiAssessments() {
  return DEMO_NODES.map((node, index) => ({
    id: `demo-assessment-${publicSlugToBackendSlug(node.slug)}`,
    nodeId: node.nodeId,
    assessedAt: createdAt,
    structuralScore: [3, 4, 4, 3, 2, 4][index] ?? 3,
    aestheticScore: [3, 3, 3, 4, 2, 3][index] ?? 3,
    functionalScore: [3, 2, 3, 3, 1, 3][index] ?? 3,
    safetyScore: [3, 3, 2, 3, 1, 4][index] ?? 3,
    energyScore: node.building?.energyScore ?? 3,
    ecologicalScore: [2, 2, 3, 4, 2, 4][index] ?? 3,
    demolitionRecommendation: publicSlugToBackendSlug(node.slug) === "village-meal" ? "partial" : "none",
    reusePotential: publicSlugToBackendSlug(node.slug) === "village-meal" ? "high" : "medium",
    source: "demo_fallback",
    node: { id: node.nodeId, slug: publicSlugToBackendSlug(node.slug), nameKey: node.nameKey, realm: node.realm },
  }))
}

export function demoApiStrategyDetail(id: string) {
  const strategy = demoApiStrategies().find((item) => item.id === id || item.node?.slug === id || id.includes(String(item.node?.slug))) ?? demoApiStrategies()[0]
  const slug = (strategy?.node?.slug ?? "ancient-road") as keyof typeof detailBySlug
  const detail = detailBySlug[slug] ?? detailBySlug["ancient-road"]

  return {
    ...strategy,
    description: `${strategy.title}：降级演示策略会保留诊断、材料、施工、空间策划和预期效果，便于无数据库或无 AI 返回时继续验收完整流程。`,
    category: `REN-DEMO-${slug}`,
    materials: [
      { name: "本地石材/旧砖复用", category: "structure", specification: "优先复用可检测合格的旧构件", localAvailability: "high" },
      { name: "竹木与轻钢构件", category: "insertion", specification: "可逆安装、便于分段施工", localAvailability: "medium" },
    ],
    techniques: [
      { name: "低扰动分段施工", category: "construction", description: "先封控风险区，再拆除低价值构件，最后植入轻量新结构。", laborRequirement: "medium" },
      { name: "新旧界面脱开处理", category: "heritage", description: "新构件与保留墙体设置清晰界面，便于后续检修和识别。", laborRequirement: "high" },
    ],
    energyConstruction: detail.energy.map(([type, name, description, estimatedEnergySaving]) => ({ type, name, description, estimatedEnergySaving })),
    ecologicalMeasures: detail.ecology.map(([type, name, description, expectedEcologicalBenefit]) => ({ type, name, description, expectedEcologicalBenefit })),
    architecturalForm: {
      formLanguage: detail.architecturalForm[0],
      massingStrategy: detail.architecturalForm[1],
      roofType: detail.architecturalForm[2],
      elevationStrategy: detail.architecturalForm[3],
    },
    buildingProgram: detail.programs.map(([space, area, capacity, requirements]) => ({ space, area, capacity, requirements })),
    oldNewRelationship: strategy.interventionType === "partial_demolish_rebuild" ? "保留可复用石墙与谷仓门，拆除腐朽木屋架和彩钢加建，植入轻钢新结构。" : "保留有价值的乡土空间格局，以可逆轻量构件补足运营功能。",
    difficultyLevel: strategy.priority === "critical" ? "high" : "medium",
  }
}

export function demoApiWeeklyResult(bizDate: string) {
  const strategies = demoApiStrategies()
  return {
    bizDate,
    nodeCount: DEMO_NODES.length,
    results: DEMO_NODES.map((node) => ({
      created: false,
      diagnosis: node.diagnosis ?? null,
      strategies: strategies.filter((strategy) => strategy.nodeId === node.nodeId),
      demo: true,
    })),
  }
}

export function demoApiDiagnosisResult(nodeId: string, bizDate: string) {
  const node = DEMO_NODES.find((item) => item.nodeId === nodeId || item.slug === nodeId || publicSlugToBackendSlug(item.slug) === nodeId) ?? DEMO_NODES[0]
  const strategies = demoApiStrategies().filter((strategy) => strategy.nodeId === node?.nodeId)
  return {
    diagnosis: node?.diagnosis ?? null,
    strategies,
    created: false,
    bizDate,
    demo: true,
  }
}

function publicSlugToBackendSlug(slug: string) {
  return slugAlias[slug] ?? (slug as keyof typeof detailBySlug)
}

function normalizeStrategyId(id: string, nodeSlug: string) {
  if (id.startsWith("demo-strategy-") && !/\d$/.test(id)) return id
  return `demo-strategy-${publicSlugToBackendSlug(nodeSlug)}`
}
