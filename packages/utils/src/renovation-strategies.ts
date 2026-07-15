import type {
  ArchitecturalForm,
  BuildingProgramItem,
  EcologicalMeasure,
  EnergyConstructionDetail,
  InterventionType,
  RenovationCategory,
  RenovationDimension,
  RenovationMaterial,
  RenovationTechnique,
} from "@zouma/contracts"

export interface StrategyTemplate {
  code: string
  title: string
  description: string
  category: RenovationCategory
  dimension: RenovationDimension
  matchIssueCodes: string[]
  interventionType: InterventionType
  oldNewRelationship: string
  materials: RenovationMaterial[]
  techniques: RenovationTechnique[]
  energyConstruction: EnergyConstructionDetail[]
  ecologicalMeasures: EcologicalMeasure[]
  architecturalForm: ArchitecturalForm
  buildingProgram: BuildingProgramItem[]
  estimatedDuration: string
  difficultyLevel: "easy" | "medium" | "hard"
  estimatedCostRange: string
  expectedImpact: string
}

const limePlaster: RenovationMaterial = {
  name: "石灰基保温砂浆",
  category: "insulation",
  specification: "内侧薄层保温，兼顾透气与防潮",
  ecoLabel: "低碳可修复",
  localAvailability: "medium",
}

const timber: RenovationMaterial = {
  name: "本地杉木/竹木复合构件",
  category: "structural",
  specification: "轻型梁柱、格栅、廊架和可替换分隔",
  ecoLabel: "可再生材料",
  localAvailability: "high",
}

const permeablePaving: RenovationMaterial = {
  name: "透水砖与碎石垫层",
  category: "ecological",
  specification: "雨水慢渗铺装，适用于院落和滨水路径",
  localAvailability: "high",
}

const lightweightInsertion: RenovationTechnique = {
  name: "轻结构嵌入",
  category: "hybrid",
  description: "以钢木或竹木轻结构植入新功能，减少对原建筑的扰动。",
  applicableConditions: ["旧墙体可保留", "需要快速施工", "适合新旧对话"],
  constructionSteps: ["测绘保留构件", "基础局部加固", "安装轻结构", "完成围护和机电"],
  laborRequirement: "medium",
}

const envelopeRetrofit: RenovationTechnique = {
  name: "低扰动围护改造",
  category: "hybrid",
  description: "优先在室内侧或夹层补足保温、防潮和门窗气密性。",
  applicableConditions: ["传统风貌需保留", "外立面不宜大改", "节能评分低"],
  constructionSteps: ["检测墙体含水率", "修补裂缝", "铺设保温层", "更换门窗密封"],
  laborRequirement: "medium",
}

const passiveVentilation: EnergyConstructionDetail = {
  type: "ventilation",
  name: "穿堂风与高侧窗组织",
  description: "通过对开洞口、高侧窗和格栅组织自然通风。",
  materials: ["木格栅", "可开启高窗", "防虫纱网"],
  estimatedEnergySaving: "夏季空调或风扇需求降低 10-20%",
  implementationNotes: "结合游客动线避免直吹展陈与餐饮操作区。",
}

const rainGarden: EcologicalMeasure = {
  type: "water_management",
  name: "雨水花园",
  description: "以浅凹绿地消纳屋面和院落径流，提升滞蓄与净化能力。",
  speciesOrMaterials: ["鸢尾", "再力花", "砾石", "透水土"],
  expectedEcologicalBenefit: "削减地表径流，提升微生境湿度。",
}

function form(formLanguage: string, massingStrategy = "维持村落尺度"): ArchitecturalForm {
  return {
    formLanguage,
    massingStrategy,
    materialPalette: ["本地木材", "石灰砂浆", "灰瓦", "透水铺装"],
    roofType: "坡屋顶或轻型棚顶",
    elevationStrategy: "保留乡土肌理，新增构件以轻、透、可识别为原则",
    relationshipToGround: "以台阶、院落和透水地面衔接地形",
    referenceImages: [],
  }
}

function program(space: string, area: number, capacity: number): BuildingProgramItem[] {
  return [{ space, area, capacity, requirements: ["自然采光", "弹性使用", "易维护"] }]
}

export const renovationStrategyCatalog: StrategyTemplate[] = [
  {
    code: "REN-EN-001",
    title: "传统民居围护结构节能改造",
    description: "在保留传统风貌的前提下补足墙体、屋面和门窗节能性能。",
    category: "energy_retrofit",
    dimension: "energy",
    matchIssueCodes: ["E1_LOW_ENERGY_SCORE", "E2_AGING_THERMAL_ENVELOPE"],
    interventionType: "renovation",
    oldNewRelationship: "保留原建筑体量和外部风貌，新增节能层隐藏于内部构造。",
    materials: [limePlaster, timber],
    techniques: [envelopeRetrofit],
    energyConstruction: [
      {
        type: "insulation",
        name: "墙体内保温与屋面隔热",
        description: "对传统墙体和坡屋顶做低扰动保温补强。",
        materials: ["石灰基保温砂浆", "岩棉板", "防潮透气膜"],
        estimatedEnergySaving: "综合能耗降低 25-40%",
        implementationNotes: "潮湿墙体需先做含水率检测和防潮节点。",
      },
    ],
    ecologicalMeasures: [],
    architecturalForm: form("低扰动乡土节能更新"),
    buildingProgram: [],
    estimatedDuration: "3-6 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥800-1500/m²",
    expectedImpact: "提升热舒适与运营季节适应性。",
  },
  {
    code: "REN-EN-002",
    title: "院落微气候调节",
    description: "通过遮阳、通风、蒸发降温和绿化提升院落舒适度。",
    category: "microclimate_improvement",
    dimension: "energy",
    matchIssueCodes: ["E3_MICROCLIMATE_STRESS", "S5_LOW_DWELL_TIME"],
    interventionType: "renovation",
    oldNewRelationship: "以可逆轻构件叠加在既有院落之上。",
    materials: [timber, permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [passiveVentilation],
    ecologicalMeasures: [rainGarden],
    architecturalForm: form("荫棚与院落微气候界面"),
    buildingProgram: program("半室外休憩院", 60, 30),
    estimatedDuration: "2-4 周",
    difficultyLevel: "easy",
    estimatedCostRange: "¥500-1000/m²",
    expectedImpact: "延长游客停留时间并降低夏季热压力。",
  },
  {
    code: "REN-SP-001",
    title: "弹性复合空间功能重组",
    description: "重组展示、消费、休憩和活动空间，缓解拥堵并提升转化。",
    category: "spatial_reorganization",
    dimension: "spatial",
    matchIssueCodes: ["S1_OVERCROWDING", "S2_LOW_FUNCTIONAL_EFFICIENCY", "S5_LOW_DWELL_TIME"],
    interventionType: "renovation",
    oldNewRelationship: "保留主要结构，内部以可移动家具和轻隔断重组。",
    materials: [timber],
    techniques: [lightweightInsertion],
    energyConstruction: [],
    ecologicalMeasures: [],
    architecturalForm: form("可变乡村公共客厅"),
    buildingProgram: program("复合活动厅", 90, 45),
    estimatedDuration: "2-5 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥600-1200/m²",
    expectedImpact: "提升空间周转效率和消费转化。",
  },
  {
    code: "REN-SP-002",
    title: "传统木结构加固修缮",
    description: "对木梁、屋架、墙体和基础进行检测、加固与修缮。",
    category: "structural_repair",
    dimension: "spatial",
    matchIssueCodes: ["S3_STRUCTURAL_CONCERN"],
    interventionType: "renovation",
    oldNewRelationship: "原构件优先修复，新增加固件清晰可识别。",
    materials: [timber],
    techniques: [
      {
        ...lightweightInsertion,
        name: "传统构件修复与隐性加固",
        description: "结合榫卯修复、钢夹板和基础补强提升安全性。",
      },
    ],
    energyConstruction: [],
    ecologicalMeasures: [],
    architecturalForm: form("修旧如旧与结构可读"),
    buildingProgram: [],
    estimatedDuration: "4-8 周",
    difficultyLevel: "hard",
    estimatedCostRange: "¥1200-2200/m²",
    expectedImpact: "降低结构风险并延长建筑寿命。",
  },
  {
    code: "REN-SP-003",
    title: "乡村无障碍与适老化改造",
    description: "补齐坡道、扶手、防滑、照明和滨水安全设施。",
    category: "accessibility_improvement",
    dimension: "spatial",
    matchIssueCodes: ["S4_WATERSIDE_SAFETY"],
    interventionType: "renovation",
    oldNewRelationship: "新增安全构件采用轻量表达，与原有边界保持距离。",
    materials: [timber, permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [
      {
        type: "lighting",
        name: "低位安全照明",
        description: "沿水岸和台阶布置低眩光照明。",
        materials: ["低位灯", "太阳能庭院灯"],
        estimatedEnergySaving: "太阳能照明降低外接能耗",
        implementationNotes: "避免眩光影响夜间生态。",
      },
    ],
    ecologicalMeasures: [],
    architecturalForm: form("安全边界轻介入"),
    buildingProgram: [],
    estimatedDuration: "1-3 周",
    difficultyLevel: "easy",
    estimatedCostRange: "¥300-800/m",
    expectedImpact: "提升滨水和坡地节点安全性。",
  },
  {
    code: "REN-DN-001",
    title: "整体拆除重建：记忆片段的新乡土建筑",
    description: "对结构失效建筑进行拆除重建，保留门框、瓦片或墙段作为记忆线索。",
    category: "structural_repair",
    dimension: "spatial",
    matchIssueCodes: ["D1_STRUCTURAL_FAILURE"],
    interventionType: "full_demolish_rebuild",
    oldNewRelationship: "旧构件作为景观墙、门廊或展陈物，新建筑承担安全运营功能。",
    materials: [timber, limePlaster],
    techniques: [lightweightInsertion],
    energyConstruction: [passiveVentilation],
    ecologicalMeasures: [rainGarden],
    architecturalForm: form("新乡土体量与记忆片段并置", "原址控制体量重建"),
    buildingProgram: program("村落共享客厅", 120, 60),
    estimatedDuration: "10-16 周",
    difficultyLevel: "hard",
    estimatedCostRange: "¥2500-3800/m²",
    expectedImpact: "消除安全风险并恢复节点运营能力。",
  },
  {
    code: "REN-DN-002",
    title: "部分拆除与新旧嵌合",
    description: "拆除低价值加建，保留老墙或屋架，植入轻量新功能核。",
    category: "spatial_reorganization",
    dimension: "spatial",
    matchIssueCodes: ["D2_LOW_VALUE_REDEVELOP", "N2_MISSING_PROGRAM"],
    interventionType: "partial_demolish_rebuild",
    oldNewRelationship: "老建筑作为壳，新功能体块作为核，二者之间保留采光和通风缝隙。",
    materials: [timber, limePlaster],
    techniques: [lightweightInsertion],
    energyConstruction: [passiveVentilation],
    ecologicalMeasures: [],
    architecturalForm: form("壳中核的新旧对话"),
    buildingProgram: program("展售与茶歇复合空间", 100, 50),
    estimatedDuration: "8-12 周",
    difficultyLevel: "hard",
    estimatedCostRange: "¥1800-3000/m²",
    expectedImpact: "保留空间记忆，同时显著提升功能承载。",
  },
  {
    code: "REN-DN-003",
    title: "场地新建：填空式轻建筑",
    description: "在邻近空地新建轻量配套建筑，承担分流、休憩、卫生或展陈功能。",
    category: "infrastructure_upgrade",
    dimension: "spatial",
    matchIssueCodes: ["N1_CAPACITY_OVERFLOW", "N2_MISSING_PROGRAM"],
    interventionType: "new_construction",
    oldNewRelationship: "新建筑作为补充节点，不抢占原建筑主体地位。",
    materials: [timber, permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [passiveVentilation],
    ecologicalMeasures: [rainGarden],
    architecturalForm: form("低矮轻量的填空建筑", "顺应地形和树阵布置"),
    buildingProgram: program("游客分流驿站", 80, 40),
    estimatedDuration: "6-10 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥1800-2600/m²",
    expectedImpact: "分担高峰客流并补足服务配套。",
  },
  {
    code: "REN-DN-004",
    title: "废墟新生：拆除后生态化",
    description: "对不宜重建的废弃节点进行生态化整理，转化为雨水花园、遗址花园或休憩平台。",
    category: "ecological_restoration",
    dimension: "ecological",
    matchIssueCodes: ["D1_STRUCTURAL_FAILURE", "G1_LOW_ECOLOGICAL_SCORE"],
    interventionType: "landscape_intervention",
    oldNewRelationship: "保留少量遗址边界，建筑消隐为生态场地。",
    materials: [permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [],
    ecologicalMeasures: [rainGarden],
    architecturalForm: form("遗址花园与生态消隐", "拆除后降低硬质体量"),
    buildingProgram: program("遗址休憩花园", 120, 35),
    estimatedDuration: "4-8 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥500-1200/m²",
    expectedImpact: "降低安全风险并提升生态渗透能力。",
  },
  {
    code: "REN-EC-001",
    title: "雨水花园与海绵乡村",
    description: "用雨水花园、渗沟和透水铺装提升院落雨洪调蓄能力。",
    category: "ecological_restoration",
    dimension: "ecological",
    matchIssueCodes: ["G1_LOW_ECOLOGICAL_SCORE", "G2_WATER_STRESS"],
    interventionType: "renovation",
    oldNewRelationship: "建筑边界不动，场地地表系统生态化更新。",
    materials: [permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [
      {
        type: "rainwater",
        name: "屋面雨水收集",
        description: "将屋面雨水导入雨水花园和蓄水桶。",
        materials: ["雨链", "卵石沟", "蓄水桶"],
        estimatedEnergySaving: "减少灌溉用水与排水负荷",
        implementationNotes: "溢流口需接入安全排水路径。",
      },
    ],
    ecologicalMeasures: [rainGarden],
    architecturalForm: form("海绵院落"),
    buildingProgram: [],
    estimatedDuration: "2-5 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥400-900/m²",
    expectedImpact: "提升雨洪韧性和院落生态质量。",
  },
  {
    code: "REN-EC-002",
    title: "滨水生态护坡与亲水平台",
    description: "将硬质驳岸更新为生态护坡，并设置安全亲水停留点。",
    category: "ecological_restoration",
    dimension: "ecological",
    matchIssueCodes: ["G3_SLOPE_EROSION", "S4_WATERSIDE_SAFETY"],
    interventionType: "renovation",
    oldNewRelationship: "把工程硬边界转化为生态缓冲边界。",
    materials: [timber, permeablePaving],
    techniques: [lightweightInsertion],
    energyConstruction: [],
    ecologicalMeasures: [
      {
        type: "biodiversity",
        name: "生态护坡植物带",
        description: "使用乡土湿生和固土植物形成分层护坡。",
        speciesOrMaterials: ["芦苇", "香蒲", "狗牙根", "石笼"],
        expectedEcologicalBenefit: "减少冲刷并提供滨水生境。",
      },
    ],
    architecturalForm: form("生态化滨水边界"),
    buildingProgram: program("亲水停留平台", 40, 20),
    estimatedDuration: "4-8 周",
    difficultyLevel: "medium",
    estimatedCostRange: "¥800-1600/m",
    expectedImpact: "兼顾滨水安全、体验和生态修复。",
  },
]

export function matchStrategies(issueCodes: string[]): StrategyTemplate[] {
  const issueSet = new Set(issueCodes)
  return renovationStrategyCatalog.filter((strategy) => strategy.matchIssueCodes.some((code) => issueSet.has(code)))
}

export function getStrategyByCode(code: string): StrategyTemplate | undefined {
  return renovationStrategyCatalog.find((strategy) => strategy.code === code)
}

export function getStrategiesByDimension(dimension: RenovationDimension): StrategyTemplate[] {
  return renovationStrategyCatalog.filter((strategy) => strategy.dimension === dimension)
}
