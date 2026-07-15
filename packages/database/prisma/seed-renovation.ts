import { prisma } from "../src/index"

type JsonSeed = Record<string, unknown> | Array<Record<string, unknown>> | string[] | number[] | []

export const RENOVATION_TARGET_SLUGS = [
  "ancient-road",
  "lychee-garden",
  "waterfront-rest",
  "ridge-courtyard",
  "village-meal",
  "tree-adoption",
] as const

const demoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
const demoNow = new Date(`${demoDate}T09:00:00.000+08:00`)

const nodeMetrics: Record<(typeof RENOVATION_TARGET_SLUGS)[number], { visitors: number; peak: number; dwell: number; attractiveness: number; safetyRisk: number }> = {
  "ancient-road": { visitors: 58, peak: 42, dwell: 18, attractiveness: 72, safetyRisk: 28 },
  "lychee-garden": { visitors: 96, peak: 68, dwell: 28, attractiveness: 82, safetyRisk: 31 },
  "waterfront-rest": { visitors: 124, peak: 76, dwell: 34, attractiveness: 78, safetyRisk: 61 },
  "ridge-courtyard": { visitors: 34, peak: 18, dwell: 92, attractiveness: 86, safetyRisk: 26 },
  "village-meal": { visitors: 14, peak: 8, dwell: 10, attractiveness: 42, safetyRisk: 73 },
  "tree-adoption": { visitors: 72, peak: 46, dwell: 24, attractiveness: 76, safetyRisk: 18 },
}

export const RENOVATION_ASSESSMENTS = [
  {
    slug: "ancient-road",
    structuralScore: 3,
    aestheticScore: 2,
    functionalScore: 3,
    safetyScore: 3,
    energyScore: 2,
    ecologicalScore: 2,
    demolitionRecommendation: "none",
    reusePotential: "medium",
    retainedElements: [{ element: "木屋架", condition: "good", reuseAs: "保留作为室内装饰结构" }],
    issues: [
      { category: "energy", severity: "major", description: "墙体无保温，冬季透风严重" },
      { category: "spatial", severity: "minor", description: "休息空间不足，游客短暂停留" },
    ],
  },
  {
    slug: "lychee-garden",
    structuralScore: 4,
    aestheticScore: 3,
    functionalScore: 2,
    safetyScore: 3,
    energyScore: 3,
    ecologicalScore: 2,
    demolitionRecommendation: "none",
    reusePotential: "low",
    retainedElements: [],
    issues: [
      { category: "spatial", severity: "major", description: "加工区与体验区混杂，动线混乱" },
      { category: "energy", severity: "minor", description: "通风差，夏季闷热" },
    ],
  },
  {
    slug: "waterfront-rest",
    structuralScore: 4,
    aestheticScore: 3,
    functionalScore: 3,
    safetyScore: 2,
    energyScore: 3,
    ecologicalScore: 3,
    demolitionRecommendation: "none",
    reusePotential: "low",
    retainedElements: [],
    issues: [
      { category: "safety", severity: "critical", description: "无安全护栏，近水风险高" },
      { category: "ecological", severity: "major", description: "硬质驳岸无生态功能" },
    ],
  },
  {
    slug: "ridge-courtyard",
    structuralScore: 3,
    aestheticScore: 4,
    functionalScore: 3,
    safetyScore: 3,
    energyScore: 1,
    ecologicalScore: 4,
    demolitionRecommendation: "none",
    reusePotential: "medium",
    retainedElements: [],
    issues: [
      { category: "energy", severity: "critical", description: "夯土墙保温差，冬季室温仅 5-8 摄氏度" },
      { category: "spatial", severity: "minor", description: "卫生间设施陈旧" },
    ],
  },
  {
    slug: "village-meal",
    structuralScore: 2,
    aestheticScore: 1,
    functionalScore: 1,
    safetyScore: 1,
    energyScore: 1,
    ecologicalScore: 1,
    demolitionRecommendation: "partial",
    demolitionReason: "石砌外墙主体尚稳固，木屋架部分腐朽需更换。彩钢瓦加建无保留价值。建议保留石墙外壳，内部新建轻钢结构二层空间。",
    reusePotential: "high",
    retainedElements: [
      { element: "石砌外墙（三面完整）", condition: "good", reuseAs: "新建筑围护外墙" },
      { element: "原木屋架构件", condition: "poor", reuseAs: "室内装饰装置（非结构）" },
      { element: "谷仓木门", condition: "fair", reuseAs: "入口庭院装置" },
    ],
    issues: [
      { category: "spatial", severity: "critical", description: "木屋架腐朽，存在坍塌风险" },
      { category: "energy", severity: "major", description: "无任何保温措施" },
      { category: "ecological", severity: "major", description: "场地硬质化严重，雨水无法下渗" },
    ],
  },
] as const

const diagnosisSeeds = [
  {
    slug: "ancient-road",
    urgency: "high",
    summary: "古道驿站建筑年代久、围护结构保温弱，宜优先做低扰动节能修缮，并补足短暂停留空间。",
    issues: [
      issue("E1", "围护结构节能不足", "砖木围护结构保温和密封性能偏弱。", "major", "energy", ["energyScore"]),
      issue("S5", "休憩承载不足", "短暂停留空间不足，高峰时人流压缩。", "minor", "spatial", ["peakVisitorDensity"]),
    ],
  },
  {
    slug: "lychee-garden",
    urgency: "medium",
    summary: "荔田工坊动线混杂、夏季热湿压力明显，适合以空间重组和微气候优化同步推进。",
    issues: [
      issue("S1", "功能混用", "加工、展陈和体验动线相互干扰。", "major", "spatial", ["functionalScore"]),
      issue("E3", "热湿环境异常", "温湿度传感器显示局部闷热。", "minor", "energy", ["sensorAnomalies"]),
    ],
  },
  {
    slug: "waterfront-rest",
    urgency: "critical",
    summary: "龙溪河岸近水风险高，硬质驳岸生态功能弱，应优先补强安全边界并恢复生态护坡。",
    issues: [
      issue("S4", "滨水安全风险", "亲水空间缺少连续护栏和防滑提示。", "critical", "spatial", ["safetyRisk"]),
      issue("G3", "生态缓冲不足", "硬质驳岸雨洪缓冲和生境功能偏弱。", "major", "ecological", ["ecologicalScore"]),
    ],
  },
  {
    slug: "ridge-courtyard",
    urgency: "high",
    summary: "岭上合院具备传统风貌价值，但节能评分低，应在保护院落格局的基础上做内保温和屋面隔热。",
    issues: [
      issue("E1", "夯土建筑保温不足", "夯土墙体和屋面热工性能弱。", "critical", "energy", ["energyScore"]),
    ],
  },
  {
    slug: "village-meal",
    urgency: "critical",
    summary: "废弃粮仓存在结构安全问题，但石砌外墙和谷仓门具备记忆价值，建议部分拆除并新旧嵌合。",
    issues: [
      issue("D2", "部分拆除需求", "木屋架腐朽，彩钢瓦加建缺乏保留价值。", "critical", "spatial", ["structuralScore", "reusePotential"]),
    ],
  },
  {
    slug: "tree-adoption",
    urgency: "medium",
    summary: "荔枝林间空地生态基础好，可作为轻量新建候选点，承接采摘高峰分流和林下休憩。",
    issues: [
      issue("N2", "林间轻量新建潜力", "空地无现有建筑，可低扰动植入服务设施。", "minor", "spatial", ["sitePotential"]),
    ],
  },
] as const

export const RENOVATION_STRATEGY_SEEDS = [
  strategy("ancient-road", "REN-DEMO-001", "传统驿站节能修缮", "energy", "renovation", "high", "approved", "3-6 周", "¥800-1500/m²", "提升夏季隔热和冬季保温，降低短时停留不适。"),
  strategy("lychee-garden", "REN-DEMO-002", "荔田工坊功能重组", "spatial", "renovation", "medium", "in_progress", "2-5 周", "¥600-1200/m²", "分离加工、展陈和体验动线，提高活动承载效率。"),
  strategy("waterfront-rest", "REN-DEMO-003", "滨水安全与生态护坡", "ecological", "ecological_restoration", "critical", "approved", "4-8 周", "¥800-1600/m", "降低亲水风险，恢复河岸生态缓冲。"),
  strategy("ridge-courtyard", "REN-DEMO-004", "夯土合院低扰动节能改造", "energy", "renovation", "high", "approved", "4-7 周", "¥900-1600/m²", "保留传统院落格局，同时改善室内热舒适。"),
  strategy("village-meal", "REN-DEMO-005", "废弃粮仓部分拆除与新旧嵌合", "spatial", "partial_demolish_rebuild", "critical", "approved", "8-12 周", "¥1800-3000/m²", "消除结构隐患，将闲置粮仓转化为展售茶歇节点。"),
  strategy("tree-adoption", "REN-DEMO-006", "荔枝林间轻量服务站", "spatial", "new_construction", "high", "verified", "6-10 周", "¥1800-2600/m²", "补齐采摘季休憩、工具和基础服务功能。"),
] as const

function issue(code: string, title: string, description: string, severity: string, dimension: string, evidenceKeys: string[]) {
  return { code, title, description, severity, dimension, evidenceKeys, suggestedActions: [] }
}

function strategy(
  slug: (typeof RENOVATION_TARGET_SLUGS)[number],
  category: string,
  title: string,
  dimension: string,
  interventionType: string,
  priority: string,
  status: string,
  estimatedDuration: string,
  estimatedCostRange: string,
  expectedImpact: string,
) {
  return { slug, category, title, dimension, interventionType, priority, status, estimatedDuration, estimatedCostRange, expectedImpact }
}

function toJson(value: JsonSeed) {
  return value
}

async function getNodeMap() {
  const nodes = await prisma.spaceNode.findMany({
    where: { slug: { in: [...RENOVATION_TARGET_SLUGS] } },
    select: { id: true, slug: true, capacity: true },
  })
  const map = Object.fromEntries(nodes.map((node) => [node.slug, node]))
  const missing = RENOVATION_TARGET_SLUGS.filter((slug) => !map[slug])
  if (missing.length > 0) {
    throw new Error(`Missing renovation seed nodes: ${missing.join(", ")}`)
  }
  return map as Record<(typeof RENOVATION_TARGET_SLUGS)[number], { id: string; slug: string; capacity: number }>
}

async function seedBuildingAssessments(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  for (const assessment of RENOVATION_ASSESSMENTS) {
    await prisma.buildingAssessment.upsert({
      where: { id: `demo-assessment-${assessment.slug}` },
      create: {
        id: `demo-assessment-${assessment.slug}`,
        nodeId: nodes[assessment.slug].id,
        assessorId: "demo-assessor",
        assessedAt: new Date(`${demoDate}T08:00:00.000+08:00`),
        structuralScore: assessment.structuralScore,
        aestheticScore: assessment.aestheticScore,
        functionalScore: assessment.functionalScore,
        safetyScore: assessment.safetyScore,
        energyScore: assessment.energyScore,
        ecologicalScore: assessment.ecologicalScore,
        demolitionRecommendation: assessment.demolitionRecommendation,
        demolitionReason: "demolitionReason" in assessment ? assessment.demolitionReason : null,
        reusePotential: assessment.reusePotential,
        retainedElements: toJson([...assessment.retainedElements]),
        issues: toJson([...assessment.issues]),
        notes: `改造系统演示评估 - ${demoDate}`,
        photos: [],
        source: "seed",
      },
      update: {
        assessedAt: new Date(`${demoDate}T08:00:00.000+08:00`),
        structuralScore: assessment.structuralScore,
        aestheticScore: assessment.aestheticScore,
        functionalScore: assessment.functionalScore,
        safetyScore: assessment.safetyScore,
        energyScore: assessment.energyScore,
        ecologicalScore: assessment.ecologicalScore,
        demolitionRecommendation: assessment.demolitionRecommendation,
        demolitionReason: "demolitionReason" in assessment ? assessment.demolitionReason : null,
        reusePotential: assessment.reusePotential,
        retainedElements: toJson([...assessment.retainedElements]),
        issues: toJson([...assessment.issues]),
        notes: `改造系统演示评估 - ${demoDate}`,
        photos: [],
        source: "seed",
      },
    })
  }
  console.log(`  创建 ${RENOVATION_ASSESSMENTS.length} 条建筑评估记录`)
}

async function seedOperationalData(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  for (const slug of RENOVATION_TARGET_SLUGS) {
    const nodeId = nodes[slug].id
    const metrics = nodeMetrics[slug]

    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const date = new Date(`${demoDate}T00:00:00.000+08:00`)
      date.setDate(date.getDate() - daysAgo)
      const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date)

      await prisma.nodeDailyScore.upsert({
        where: { nodeId_date: { nodeId, date: dateStr } },
        create: {
          nodeId,
          date: dateStr,
          totalVisitors: Math.max(1, metrics.visitors - daysAgo * 3),
          peakPeopleCount: Math.max(1, metrics.peak - daysAgo * 2),
          avgDwellMin: metrics.dwell,
          attractiveness: metrics.attractiveness,
          safetyRisk: metrics.safetyRisk,
          weatherCondition: daysAgo % 3 === 0 ? "rainy" : "sunny",
        },
        update: {
          totalVisitors: Math.max(1, metrics.visitors - daysAgo * 3),
          peakPeopleCount: Math.max(1, metrics.peak - daysAgo * 2),
          avgDwellMin: metrics.dwell,
          attractiveness: metrics.attractiveness,
          safetyRisk: metrics.safetyRisk,
          weatherCondition: daysAgo % 3 === 0 ? "rainy" : "sunny",
        },
      })
    }

    for (const hour of [8, 10, 12, 14, 16, 18]) {
      const peopleCount = Math.max(1, Math.round(metrics.peak * (0.52 + hour / 80)))
      await prisma.presenceLog.upsert({
        where: { id: `demo-renovation-presence-${slug}-${hour}` },
        create: {
          id: `demo-renovation-presence-${slug}-${hour}`,
          nodeId,
          timestamp: new Date(`${demoDate}T${String(hour).padStart(2, "0")}:00:00.000+08:00`),
          peopleCount,
          dwellAvgMin: metrics.dwell,
          source: "renovation_seed",
        },
        update: {
          timestamp: new Date(`${demoDate}T${String(hour).padStart(2, "0")}:00:00.000+08:00`),
          peopleCount,
          dwellAvgMin: metrics.dwell,
          source: "renovation_seed",
        },
      })
    }
  }

  await seedDevices(nodes)
  await seedFeedbackAndOrders(nodes)
  console.log("  创建改造演示运营数据")
}

async function seedDevices(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  const devices = [
    ["demo-renovation-device-water", "renovation-waterfront-01", "龙溪亲水安全传感器", "water_level", nodes["waterfront-rest"].id, "龙溪河岸"],
    ["demo-renovation-device-workshop", "renovation-workshop-01", "荔田工坊温湿度", "weather", nodes["lychee-garden"].id, "荔田工坊"],
  ] as const

  for (const [id, deviceId, name, type, nodeId, location] of devices) {
    await prisma.device.upsert({
      where: { deviceId },
      create: { id, deviceId, name, type, status: "active", nodeId, location, lastSeenAt: demoNow },
      update: { name, type, status: "active", nodeId, location, lastSeenAt: demoNow },
    })
  }

  const readings = [
    ["demo-renovation-reading-water", "renovation-waterfront-01", "water_level", 5, "cm"],
    ["demo-renovation-reading-workshop-temp", "renovation-workshop-01", "temperature", 37, "°C"],
    ["demo-renovation-reading-workshop-humidity", "renovation-workshop-01", "humidity", 88, "%"],
  ] as const

  for (const [id, deviceId, type, value, unit] of readings) {
    await prisma.deviceReading.upsert({
      where: { id },
      create: { id, deviceId, type, value, unit, raw: { demo: true, source: "renovation_seed" }, createdAt: demoNow },
      update: { type, value, unit, raw: { demo: true, source: "renovation_seed" }, createdAt: demoNow },
    })
  }
}

async function seedFeedbackAndOrders(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  const feedbacks = [
    ["demo-renovation-fb-waterfront", "facility", "urgent", "龙溪河岸缺少安全护栏，带孩子来很担心。", 2],
    ["demo-renovation-fb-village-meal", "facility", "urgent", "废弃粮仓墙面开裂，感觉不安全。", 1],
    ["demo-renovation-fb-ancient-road", "facility", "high", "古道驿亭希望能有遮阳避雨和短暂停留空间。", 3],
  ] as const

  for (const [id, category, severity, content, rating] of feedbacks) {
    await prisma.feedbackTicket.upsert({
      where: { id },
      create: { id, source: "renovation_seed", category, severity, content, rating, status: "submitted", createdAt: demoNow, updatedAt: demoNow },
      update: { source: "renovation_seed", category, severity, content, rating, status: "submitted", updatedAt: demoNow },
    })
  }

  for (let index = 0; index < 8; index++) {
    await prisma.unifiedOrder.upsert({
      where: { id: `demo-renovation-order-${index + 1}` },
      create: {
        id: `demo-renovation-order-${index + 1}`,
        orderType: "product_order",
        productId: "demo-renovation-product-lychee",
        productName: "荔枝干体验包",
        quantity: 1,
        totalAmount: 38 + index * 3,
        status: "paid",
        nodeId: nodes["lychee-garden"].id,
        metadata: { demo: true, source: "renovation_seed" },
      },
      update: {
        orderType: "product_order",
        productId: "demo-renovation-product-lychee",
        productName: "荔枝干体验包",
        quantity: 1,
        totalAmount: 38 + index * 3,
        status: "paid",
        nodeId: nodes["lychee-garden"].id,
        metadata: { demo: true, source: "renovation_seed" },
      },
    })
  }
}

async function seedSitePotentials(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  const potentials = [
    {
      id: "demo-site-tree-adoption-01",
      locationName: "林间观景台",
      locationLat: 29.8472,
      locationLng: 107.0493,
      siteArea: 120,
      currentUse: "荔枝林边缘空地",
      suitabilityScore: 5,
      accessibilityScore: 4,
      viewScore: 5,
      ecologyImpactScore: 4,
      recommendedProgram: "观景茶亭",
      recommendedForm: "轻木构·架空·单坡顶",
      recommendedFloors: 1,
      recommendedGFA: 45,
      formKeywords: ["轻介入", "木构", "架空", "全开放立面"],
      constraints: [{ type: "tree_protection", description: "保留场地内所有荔枝树" }],
      rationale: "荔枝林南缘视野开阔，可提供遮阳休憩和观景停留。",
    },
    {
      id: "demo-site-tree-adoption-02",
      locationName: "采摘工具棚",
      locationLat: 29.8468,
      locationLng: 107.0488,
      siteArea: 60,
      currentUse: "农具堆放",
      suitabilityScore: 3,
      accessibilityScore: 5,
      viewScore: 2,
      ecologyImpactScore: 5,
      recommendedProgram: "农具+休憩复合站",
      recommendedForm: "简易棚架·可拆卸·竹构",
      recommendedFloors: 1,
      recommendedGFA: 25,
      formKeywords: ["竹构", "可拆卸", "零基础"],
      constraints: [],
      rationale: "靠近主路径，兼具工具存放和采摘休息功能。",
    },
  ] as const

  for (const potential of potentials) {
    await prisma.sitePotential.upsert({
      where: { id: potential.id },
      create: {
        ...potential,
        nodeId: nodes["tree-adoption"].id,
        formKeywords: toJson([...potential.formKeywords]),
        constraints: toJson([...potential.constraints]),
        status: "proposed",
      },
      update: {
        nodeId: nodes["tree-adoption"].id,
        locationName: potential.locationName,
        locationLat: potential.locationLat,
        locationLng: potential.locationLng,
        siteArea: potential.siteArea,
        currentUse: potential.currentUse,
        suitabilityScore: potential.suitabilityScore,
        accessibilityScore: potential.accessibilityScore,
        viewScore: potential.viewScore,
        ecologyImpactScore: potential.ecologyImpactScore,
        recommendedProgram: potential.recommendedProgram,
        recommendedForm: potential.recommendedForm,
        recommendedFloors: potential.recommendedFloors,
        recommendedGFA: potential.recommendedGFA,
        formKeywords: toJson([...potential.formKeywords]),
        constraints: toJson([...potential.constraints]),
        rationale: potential.rationale,
        status: "proposed",
      },
    })
  }
  console.log(`  创建 ${potentials.length} 条选址潜力记录`)
}

async function seedDiagnosesAndStrategies(nodes: Awaited<ReturnType<typeof getNodeMap>>) {
  for (const diagnosisSeed of diagnosisSeeds) {
    const metrics = nodeMetrics[diagnosisSeed.slug]
    const diagnosisId = `demo-diagnosis-${diagnosisSeed.slug}`
    await prisma.spatialDiagnosis.upsert({
      where: { id: diagnosisId },
      create: {
        id: diagnosisId,
        nodeId: nodes[diagnosisSeed.slug].id,
        bizDate: demoDate,
        urgency: diagnosisSeed.urgency,
        issues: toJson([...diagnosisSeed.issues]),
        evidenceJson: toJson({
          crowdStress: metrics.peak / Math.max(nodes[diagnosisSeed.slug].capacity, 1),
          feedbackRatio: diagnosisSeed.slug === "waterfront-rest" ? 0.24 : 0.12,
          safetyScore: Math.max(1, 5 - Math.round(metrics.safetyRisk / 20)),
          energyScore: diagnosisSeed.slug === "tree-adoption" ? 4 : 2,
          ecologicalScore: diagnosisSeed.slug === "waterfront-rest" ? 2 : 3,
          conversionRate: diagnosisSeed.slug === "lychee-garden" ? 0.08 : null,
          sensorAnomalies: diagnosisSeed.slug === "lychee-garden" ? ["temperature_high", "humidity_high"] : [],
          recentAlerts: diagnosisSeed.slug === "waterfront-rest" ? 2 : 0,
        }),
        aiSummary: diagnosisSeed.summary,
        energyIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "energy")),
        spatialIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "spatial")),
        ecologicalIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "ecological")),
        status: "approved",
      },
      update: {
        bizDate: demoDate,
        urgency: diagnosisSeed.urgency,
        issues: toJson([...diagnosisSeed.issues]),
        aiSummary: diagnosisSeed.summary,
        energyIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "energy")),
        spatialIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "spatial")),
        ecologicalIssues: toJson(diagnosisSeed.issues.filter((item) => item.dimension === "ecological")),
        status: "approved",
      },
    })
  }

  for (const strategySeed of RENOVATION_STRATEGY_SEEDS) {
    await prisma.renovationStrategy.upsert({
      where: { id: `demo-strategy-${strategySeed.slug}` },
      create: {
        id: `demo-strategy-${strategySeed.slug}`,
        nodeId: nodes[strategySeed.slug].id,
        diagnosisId: `demo-diagnosis-${strategySeed.slug}`,
        category: strategySeed.category,
        title: strategySeed.title,
        description: `${strategySeed.title}：面向 ${strategySeed.slug} 的后端演示策略，包含材料、工期、造价和预期效果。`,
        dimension: strategySeed.dimension,
        materials: toJson([{ name: "本地材料优先", category: "finishing", specification: "结合节点条件选型", localAvailability: "high" }]),
        techniques: toJson([{ name: strategySeed.title, category: "hybrid", description: strategySeed.expectedImpact, applicableConditions: [strategySeed.slug], constructionSteps: ["现场复核", "分段施工", "运营验收"], laborRequirement: "medium" }]),
        energyConstruction: toJson(strategySeed.dimension === "energy" ? [{ part: "屋面与墙体", method: "低扰动保温隔热", expectedSaving: "15-25%" }] : []),
        ecologicalMeasures: toJson(strategySeed.dimension === "ecological" ? [{ measure: "生态护坡", biodiversityBenefit: "恢复水岸缓冲", maintenanceCycle: "季度巡检" }] : []),
        interventionType: strategySeed.interventionType,
        oldNewRelationship: strategySeed.interventionType === "partial_demolish_rebuild" ? "保留可复用石墙与谷仓门，拆除腐朽木屋架和彩钢加建，植入轻钢新结构。" : null,
        architecturalForm: toJson({ massing: strategySeed.interventionType === "new_construction" ? "低矮轻量" : "延续原有尺度", style: "乡土现代融合" }),
        buildingProgram: toJson([{ name: "公共服务", areaRatio: 0.45 }, { name: "展示停留", areaRatio: 0.35 }]),
        estimatedDuration: strategySeed.estimatedDuration,
        difficultyLevel: strategySeed.priority === "critical" ? "high" : "medium",
        estimatedCostRange: strategySeed.estimatedCostRange,
        expectedImpact: strategySeed.expectedImpact,
        priority: strategySeed.priority,
        status: strategySeed.status,
        beforeMetrics: toJson(nodeMetrics[strategySeed.slug]),
        afterMetrics: strategySeed.status === "verified" ? toJson({ satisfaction: 4.4, safetyRisk: 12, avgDwellMin: 31 }) : {},
      },
      update: {
        diagnosisId: `demo-diagnosis-${strategySeed.slug}`,
        category: strategySeed.category,
        title: strategySeed.title,
        description: `${strategySeed.title}：面向 ${strategySeed.slug} 的后端演示策略，包含材料、工期、造价和预期效果。`,
        dimension: strategySeed.dimension,
        interventionType: strategySeed.interventionType,
        estimatedDuration: strategySeed.estimatedDuration,
        difficultyLevel: strategySeed.priority === "critical" ? "high" : "medium",
        estimatedCostRange: strategySeed.estimatedCostRange,
        expectedImpact: strategySeed.expectedImpact,
        priority: strategySeed.priority,
        status: strategySeed.status,
        beforeMetrics: toJson(nodeMetrics[strategySeed.slug]),
        afterMetrics: strategySeed.status === "verified" ? toJson({ satisfaction: 4.4, safetyRisk: 12, avgDwellMin: 31 }) : {},
      },
    })
  }
  console.log(`  创建 ${RENOVATION_STRATEGY_SEEDS.length} 条诊断策略记录`)
}

export async function seedRenovation() {
  console.log("\n改造系统演示数据填充开始...")
  const nodes = await getNodeMap()

  await seedBuildingAssessments(nodes)
  await seedOperationalData(nodes)
  await seedSitePotentials(nodes)
  await seedDiagnosesAndStrategies(nodes)

  console.log("改造系统演示数据填充完成\n")
}
