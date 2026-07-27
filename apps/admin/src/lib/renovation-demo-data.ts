const createdAt = "2026-07-01T09:00:00.000+08:00"

export const renovationDemoPhotos: Record<string, { url: string; alt: string }> = {
  "ancient-road": {
    url: "/images/renovation/ai/ancient-road-energy-retrofit.jpg",
    alt: "古道驿站节能修缮示意照片",
  },
  "lychee-garden": {
    url: "/images/renovation/ai/lychee-workshop-reorganization.jpg",
    alt: "荔田工坊功能重组示意照片",
  },
  "waterfront-rest": {
    url: "/images/renovation/ai/waterfront-ecological-revetment.jpg",
    alt: "龙溪河岸生态护坡示意照片",
  },
  "ridge-courtyard": {
    url: "/images/renovation/ai/ridge-courtyard-energy-retrofit.jpg",
    alt: "岭上合院低扰动节能改造示意照片",
  },
  "village-meal": {
    url: "/images/renovation/ai/village-meal-granary.jpg",
    alt: "废弃粮仓部分拆除与新旧嵌合示意照片",
  },
  "tree-adoption": {
    url: "/images/renovation/ai/lychee-grove-service-station.jpg",
    alt: "荔枝林间空地轻量新建示意照片",
  },
}

export function getRenovationDemoPhoto(slug?: string | null) {
  return slug ? renovationDemoPhotos[slug] : undefined
}

const nodes = {
  "ancient-road": { id: "demo-node-ancient-road", slug: "ancient-road", nameKey: "古道驿站", realm: "ancient_road", nodeType: "heritage_stop" },
  "lychee-garden": { id: "demo-node-lychee-garden", slug: "lychee-garden", nameKey: "荔田工坊", realm: "lychee_field", nodeType: "workshop" },
  "waterfront-rest": { id: "demo-node-waterfront-rest", slug: "waterfront-rest", nameKey: "龙溪河岸", realm: "resilience_valley", nodeType: "waterside" },
  "ridge-courtyard": { id: "demo-node-ridge-courtyard", slug: "ridge-courtyard", nameKey: "岭上合院", realm: "ridge_dwelling", nodeType: "courtyard" },
  "village-meal": { id: "demo-node-village-meal", slug: "village-meal", nameKey: "乡宴餐点", realm: "ridge_dwelling", nodeType: "abandoned_building" },
  "tree-adoption": { id: "demo-node-tree-adoption", slug: "tree-adoption", nameKey: "荔枝认养林", realm: "lychee_field", nodeType: "vacant_site" },
} as const

const demoDiagnosis = {
  "ancient-road": "古道驿站建筑年代较久，砖木围护结构保温和密封性能偏弱，适合低扰动节能修缮。",
  "lychee-garden": "荔田工坊加工、展陈和体验动线混杂，夏季热湿压力明显，需要功能重组和微气候优化。",
  "waterfront-rest": "龙溪河岸近水风险和坡地冲刷风险偏高，应优先补强安全边界并恢复生态护坡。",
  "ridge-courtyard": "岭上合院保留传统院落格局，但节能评分偏低，适合内保温、屋面隔热和雨水整理。",
  "village-meal": "废弃粮仓存在结构安全问题，但石砌外墙和谷仓门具备记忆价值，建议部分拆除并新旧嵌合。",
  "tree-adoption": "荔枝林间空地生态基础好，可低扰动植入轻量服务站，承接采摘高峰分流。",
} as const

export const demoRenovationStrategyDetails = [
  demoStrategy({
    slug: "ancient-road",
    title: "传统驿站节能修缮",
    dimension: "energy",
    interventionType: "renovation",
    priority: "high",
    status: "approved",
    duration: "3-6 周",
    cost: "¥800-1500/m²",
    impact: "提升夏季隔热和冬季保温，降低短时停留不适。",
    oldNew: "保留原有砖木尺度和驿亭廊下关系，在内侧补入可逆保温层与门窗密封构造。",
    form: ["传统驿亭低扰动修缮", "延续一层坡屋顶体量", "小青瓦坡屋面加隔热层", "保留木柱和灰砖立面"],
    programs: [["短停休憩", "32m²", "16 人", "靠近古道入口，配置长凳和遮雨檐"], ["导览展示", "18m²", "12 人", "墙面设置路线、风险提示和村史展陈"]],
    energy: [["屋面隔热", "竹木基层加薄型隔热板", "在不改变屋面外观的前提下降低热辐射。", "15-22%"], ["门窗密封", "木窗修补和可逆密封条", "减少冬季穿堂风并保留原窗比例。", "8-12%"]],
  }),
  demoStrategy({
    slug: "lychee-garden",
    title: "荔田工坊功能重组",
    dimension: "spatial",
    interventionType: "renovation",
    priority: "medium",
    status: "in_progress",
    duration: "2-5 周",
    cost: "¥600-1200/m²",
    impact: "分离加工、展陈和体验动线，提高活动承载效率。",
    oldNew: "保留既有砖混主体，拆除临时隔断，以轻质展架、可移动操作台和遮阳棚组织复合活动。",
    form: ["田园工坊复合更新", "一层开敞式加工展陈体量", "半透明遮阳棚与排水檐沟", "砖墙、竹帘和可开启窗扇组合"],
    programs: [["加工操作", "46m²", "18 人", "靠近水电点位，配置可清洗操作台"], ["展陈售卖", "36m²", "24 人", "与游客入口相邻，避免穿越加工区"], ["体验课堂", "42m²", "20 人", "可与展陈区合并举办课程"]],
    ecology: [["雨水花园", "林缘浅沟雨水花园", "消纳棚面雨水，改善工坊周边湿热环境。", "提升渗透和微生境"]],
  }),
  demoStrategy({
    slug: "waterfront-rest",
    title: "滨水安全与生态护坡",
    dimension: "ecological",
    interventionType: "ecological_restoration",
    priority: "critical",
    status: "approved",
    duration: "4-8 周",
    cost: "¥800-1600/m",
    impact: "降低亲水风险，恢复河岸生态缓冲。",
    oldNew: "保留现有步道高程，替换硬质破损边界，叠加生态护坡、连续栏杆和观景平台。",
    form: ["滨水低干预景观修复", "顺岸线展开的线性平台", "防滑木平台与局部雨棚", "石阶、木栏杆和草本护坡过渡"],
    programs: [["安全观景", "52m²", "30 人", "栏杆连续高度不低于 1.1m"], ["生态缓冲", "120m", "岸线", "采用本地草本、卵石和渗透基质"]],
    ecology: [["生态护坡", "卵石滞留带和挺水植物", "削减径流冲刷，恢复河岸缓冲。", "提升水岸生境"], ["安全边界", "连续栏杆和防滑铺装", "降低儿童和老人近水风险。", "减少运营警情"]],
  }),
  demoStrategy({
    slug: "ridge-courtyard",
    title: "夯土合院低扰动节能改造",
    dimension: "energy",
    interventionType: "renovation",
    priority: "high",
    status: "approved",
    duration: "4-7 周",
    cost: "¥900-1600/m²",
    impact: "保留传统院落格局，同时改善室内热舒适。",
    oldNew: "保留夯土外墙肌理、院落尺度和木构屋架，从室内侧植入可逆保温和雨水收集系统。",
    form: ["夯土合院保护性更新", "围合院落与低矮厢房", "小青瓦屋面加隔热层", "夯土墙、木窗和局部灰砖修补"],
    programs: [["共享厅堂", "58m²", "26 人", "保持面向院落的开敞关系"], ["民宿客房", "72m²", "8 人", "内侧保温不破坏外墙肌理"], ["后勤储藏", "20m²", "运营", "整合雨水桶和清洁工具"]],
    energy: [["内侧保温", "透气型保温砂浆", "避免外立面改变，提升冬季室温。", "18-28%"], ["屋面隔热", "瓦下通风层和薄型隔热毡", "减少夏季屋面热增益。", "12-18%"]],
  }),
  demoStrategy({
    slug: "village-meal",
    title: "废弃粮仓部分拆除与新旧嵌合",
    dimension: "spatial",
    interventionType: "partial_demolish_rebuild",
    priority: "critical",
    status: "approved",
    duration: "8-12 周",
    cost: "¥1800-3000/m²",
    impact: "消除结构隐患，将闲置粮仓转化为展售茶歇节点。",
    oldNew: "保留可复用石墙与谷仓门，拆除腐朽木屋架和彩钢加建，植入轻钢新结构和可识别的新屋面。",
    form: ["粮仓外壳与轻钢新构嵌合", "保留石墙围合，内部二次结构独立受力", "半透明轻屋面与原墙脱开", "石砌墙面、木门和黑色钢构形成新旧对比"],
    programs: [["展售茶歇", "64m²", "32 人", "面向乡宴动线，提供茶歇、农产品展示和收银"], ["后场备餐", "28m²", "6 人", "靠近服务入口，保留排烟和清洗条件"], ["记忆展廊", "22m²", "18 人", "利用保留石墙和谷仓门讲述粮仓故事"]],
    ecology: [["透水庭院", "拆除硬化地面后改为透水铺装", "恢复雨水下渗并降低庭院积水。", "减少径流外排"]],
  }),
  demoStrategy({
    slug: "tree-adoption",
    title: "荔枝林间轻量服务站",
    dimension: "spatial",
    interventionType: "new_construction",
    priority: "high",
    status: "verified",
    duration: "6-10 周",
    cost: "¥1800-2600/m²",
    impact: "补齐采摘季休憩、工具和基础服务功能。",
    oldNew: "避让现状树阵和主要根系，采用架空木平台与可拆装构件，形成低矮、可维护的林下服务节点。",
    form: ["林下低矮轻建筑", "单层架空平台，避让树冠和根系", "轻质透明顶棚和可拆竹木屏风", "木构、竹编和少量金属连接件"],
    programs: [["林下休憩", "48m²", "24 人", "面向认养树和采摘动线"], ["工具借还", "12m²", "运营", "集中存放采摘篮、雨具和清洁工具"], ["饮水补给", "10m²", "高峰服务", "配置饮水和临时售卖台"]],
    ecology: [["架空基础", "点式基础避让根系", "减少对荔枝树根和地表径流的扰动。", "保护林下生态"]],
  }),
]

export const demoRenovationStrategies = demoRenovationStrategyDetails.map((strategy) => ({
  id: strategy.id,
  nodeId: strategy.nodeId,
  title: strategy.title,
  dimension: strategy.dimension,
  interventionType: strategy.interventionType,
  priority: strategy.priority,
  status: strategy.status,
  estimatedDuration: strategy.estimatedDuration,
  estimatedCostRange: strategy.estimatedCostRange,
  createdAt,
  node: strategy.node,
  diagnosis: strategy.diagnosis,
}))

const assessmentScores = [
  { structuralScore: 3, aestheticScore: 3, functionalScore: 3, safetyScore: 3, energyScore: 2, ecologicalScore: 2, demolitionRecommendation: "none", reusePotential: "medium" },
  { structuralScore: 4, aestheticScore: 3, functionalScore: 2, safetyScore: 3, energyScore: 3, ecologicalScore: 2, demolitionRecommendation: "none", reusePotential: "medium" },
  { structuralScore: 4, aestheticScore: 3, functionalScore: 3, safetyScore: 2, energyScore: 4, ecologicalScore: 3, demolitionRecommendation: "none", reusePotential: "low" },
  { structuralScore: 3, aestheticScore: 4, functionalScore: 3, safetyScore: 3, energyScore: 1, ecologicalScore: 4, demolitionRecommendation: "conditional", reusePotential: "high" },
  { structuralScore: 2, aestheticScore: 2, functionalScore: 1, safetyScore: 1, energyScore: 1, ecologicalScore: 2, demolitionRecommendation: "partial", reusePotential: "high" },
  { structuralScore: 4, aestheticScore: 3, functionalScore: 3, safetyScore: 4, energyScore: 4, ecologicalScore: 4, demolitionRecommendation: "none", reusePotential: "high" },
] as const

export const demoBuildingAssessments = demoRenovationStrategyDetails.map((strategy, index) => {
  const scores = assessmentScores[index] ?? assessmentScores[0]

  return {
    id: `demo-assessment-${strategy.node?.slug}`,
    nodeId: strategy.nodeId,
    assessedAt: createdAt,
    structuralScore: scores.structuralScore,
    aestheticScore: scores.aestheticScore,
    functionalScore: scores.functionalScore,
    safetyScore: scores.safetyScore,
    energyScore: scores.energyScore,
    ecologicalScore: scores.ecologicalScore,
    demolitionRecommendation: scores.demolitionRecommendation,
    reusePotential: scores.reusePotential,
    source: "demo_fallback",
    node: strategy.node,
  }
})

export function getDemoRenovationStrategy(id?: string | null) {
  if (!id) return demoRenovationStrategyDetails[0]
  return (
    demoRenovationStrategyDetails.find((strategy) => strategy.id === id || strategy.node?.slug === id || id.includes(String(strategy.node?.slug))) ??
    demoRenovationStrategyDetails.find((strategy) => strategy.node?.slug === "village-meal") ??
    demoRenovationStrategyDetails[0]
  )
}

function demoStrategy({
  slug,
  title,
  dimension,
  interventionType,
  priority,
  status,
  duration,
  cost,
  impact,
  oldNew,
  form,
  programs,
  energy = [],
  ecology = [],
}: {
  slug: keyof typeof nodes
  title: string
  dimension: string
  interventionType: string
  priority: string
  status: string
  duration: string
  cost: string
  impact: string
  oldNew: string
  form: [string, string, string, string]
  programs: Array<[string, string, string, string]>
  energy?: Array<[string, string, string, string]>
  ecology?: Array<[string, string, string, string]>
}) {
  const node = nodes[slug]
  return {
    id: `demo-strategy-${slug}`,
    nodeId: node.id,
    title,
    description: `${title}：降级演示策略会保留诊断、材料、施工、空间策划和预期效果，便于无数据库或无 AI 返回时继续验收完整流程。`,
    category: `REN-DEMO-${slug}`,
    dimension,
    interventionType,
    oldNewRelationship: oldNew,
    materials: [
      { name: "本地石材/旧砖复用", category: "structure", specification: "优先复用可检测合格的旧构件", localAvailability: "high" },
      { name: "竹木与轻钢构件", category: "insertion", specification: "可逆安装、便于分段施工", localAvailability: "medium" },
    ],
    techniques: [
      { name: "低扰动分段施工", category: "construction", description: "先封控风险区，再拆除低价值构件，最后植入轻量新结构。", laborRequirement: "medium" },
      { name: "新旧界面脱开处理", category: "heritage", description: "新构件与保留墙体设置清晰界面，便于后续检修和识别。", laborRequirement: "high" },
    ],
    energyConstruction: (energy.length ? energy : [["基础节能校核", "自然通风和遮阳优化", "在不增加复杂机电系统的前提下改善热舒适。", "6-10%"]]).map(([type, name, description, estimatedEnergySaving]) => ({ type, name, description, estimatedEnergySaving })),
    ecologicalMeasures: (ecology.length ? ecology : [["雨水与绿化整理", "透水铺装和乡土植被补植", "减少硬化径流，维持村落微生态。", "提升渗透和遮阴"]]).map(([type, name, description, expectedEcologicalBenefit]) => ({ type, name, description, expectedEcologicalBenefit })),
    architecturalForm: {
      formLanguage: form[0],
      massingStrategy: form[1],
      roofType: form[2],
      elevationStrategy: form[3],
    },
    buildingProgram: programs.map(([space, area, capacity, requirements]) => ({ space, area, capacity, requirements })),
    estimatedDuration: duration,
    difficultyLevel: priority === "critical" ? "high" : "medium",
    estimatedCostRange: cost,
    expectedImpact: impact,
    priority,
    status,
    createdAt,
    node,
    diagnosis: {
      urgency: priority === "critical" ? "critical" : priority,
      aiSummary: demoDiagnosis[slug],
      evidenceJson: { demo: true, source: "renovation_demo_fallback" },
    },
  }
}
