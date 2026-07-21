import { prisma } from "../src/index"

const demoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
const demoNow = new Date(`${demoDate}T09:00:00.000+08:00`)

const demoVillagers = [
  {
    id: "demo-villager-001",
    name: "李桂兰",
    phone: "17732954821",
    skills: ["farming", "tree_care"],
    nodeSlug: "lychee-field-core",
  },
  {
    id: "demo-villager-002",
    name: "张德明",
    phone: "13900001111",
    skills: ["guiding", "safety"],
    nodeSlug: "ancient-road-core",
  },
  {
    id: "demo-villager-003",
    name: "陈素芬",
    phone: "13900002222",
    skills: ["cooking", "service"],
    nodeSlug: "ridge-dwelling-core",
  },
  {
    id: "demo-villager-004",
    name: "周启明",
    phone: "13900003333",
    skills: ["maintenance", "device"],
    nodeSlug: "resilience-valley-core",
  },
]

const demoUsers = [
  {
    id: "demo-user-001",
    mobile: "13800000001",
    nickname: "林女士",
    role: "visitor",
    ageGroup: "family",
    travelPref: ["tree_adoption", "food_class"],
    mobilityLevel: "normal",
    childFlag: true,
  },
  {
    id: "demo-user-002",
    mobile: "13800000002",
    nickname: "王先生",
    role: "visitor",
    ageGroup: "senior",
    travelPref: ["ancient_road", "slow_walk"],
    mobilityLevel: "low",
    childFlag: false,
  },
  {
    id: "demo-user-003",
    mobile: "13800000003",
    nickname: "陈同学",
    role: "visitor",
    ageGroup: "young",
    travelPref: ["routes", "photo"],
    mobilityLevel: "high",
    childFlag: false,
  },
]

const nodeSlugs = [
  "ancient-road-core",
  "lychee-field-core",
  "resilience-valley-core",
  "ridge-dwelling-core",
] as const

async function nodeId(slug: string) {
  const node = await prisma.spaceNode.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!node) throw new Error(`Missing seed node: ${slug}`)
  return node.id
}

async function treeId(treeCode: string) {
  const tree = await prisma.orchardTree.findUnique({
    where: { treeCode },
    select: { id: true },
  })
  if (!tree) throw new Error(`Missing seed tree: ${treeCode}`)
  return tree.id
}

export async function seedDemoData() {
  const nodes = Object.fromEntries(
    await Promise.all(nodeSlugs.map(async (slug) => [slug, await nodeId(slug)])),
  ) as Record<(typeof nodeSlugs)[number], string>

  await seedDemoVillagers(nodes)
  await seedDemoUsers()
  await seedDemoCourtyards()
  await seedDemoTicketProducts()
  await seedDemoTasks(nodes)
  await seedDemoDevices(nodes)
  await seedDemoActivities()
  await seedDemoOrders(nodes)
  await seedDemoTicketOrders()
  await seedDemoPaymentsAndConsents()
  await seedDemoVisitorsAndScores(nodes)
  await seedDemoTreeOperations()
  await seedDemoReportsAndRecommendations(nodes)
  await seedDemoNotifications()
  await seedDemoRoutes()
}

async function seedDemoVillagers(nodes: Record<string, string>) {
  for (const villager of demoVillagers) {
    await prisma.villager.upsert({
      where: { id: villager.id },
      create: {
        id: villager.id,
        name: villager.name,
        phone: villager.phone,
        skills: villager.skills,
        nodeId: nodes[villager.nodeSlug],
        status: "active",
      },
      update: {
        name: villager.name,
        phone: villager.phone,
        skills: villager.skills,
        nodeId: nodes[villager.nodeSlug],
        status: "active",
      },
    })
  }
}

async function seedDemoUsers() {
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { mobile: user.mobile },
      create: {
        id: user.id,
        mobile: user.mobile,
        nickname: user.nickname,
        role: user.role,
        jwtSalt: `demo-salt-${user.id}`,
        lastLoginAt: demoNow,
        profile: {
          create: {
            ageGroup: user.ageGroup,
            travelPref: user.travelPref,
            mobilityLevel: user.mobilityLevel,
            childFlag: user.childFlag,
          },
        },
      },
      update: {
        nickname: user.nickname,
        role: user.role,
        jwtSalt: `demo-salt-${user.id}`,
        lastLoginAt: demoNow,
        profile: {
          upsert: {
            create: {
              ageGroup: user.ageGroup,
              travelPref: user.travelPref,
              mobilityLevel: user.mobilityLevel,
              childFlag: user.childFlag,
            },
            update: {
              ageGroup: user.ageGroup,
              travelPref: user.travelPref,
              mobilityLevel: user.mobilityLevel,
              childFlag: user.childFlag,
            },
          },
        },
      },
    })
  }
}

async function seedDemoCourtyards() {
  const courtyards = [
    {
      id: "ridge-shared-courtyard",
      name: "岭上共居院",
      sceneRealm: "ridge_dwelling",
      capacity: 8,
      status: "active",
      description: "适合轻住宿、村宴和小型共创活动的岭上院落。",
      amenities: ["sharedKitchen", "courtyardTea", "lowCarbonRoom", "parkingTransfer"],
      images: ["/images/home/courtyard-booking-generated.webp"],
    },
    {
      id: "lychee-food-courtyard",
      name: "荔枝食育院",
      sceneRealm: "lychee_field",
      capacity: 12,
      status: "active",
      description: "连接采摘、食育课堂和亲子体验的荔田院落。",
      amenities: ["foodClassroom", "harvestTable", "familyFriendly", "rainShelter"],
      images: ["/images/courtyards/lychee-food-courtyard.webp"],
    },
    {
      id: "ancient-road-station",
      name: "古道驿站院",
      sceneRealm: "ancient_road",
      capacity: 6,
      status: "maintenance",
      description: "古道入口轻休憩节点，当前用于演示维护状态。",
      amenities: ["audioGuide", "teaBreak", "lightWalk", "historyWall"],
      images: ["/images/courtyards/ancient-road-station.webp"],
    },
    {
      id: "resilience-water-courtyard",
      name: "韧谷水岸院",
      sceneRealm: "resilience_valley",
      capacity: 10,
      status: "active",
      description: "面向研学和水脉观察的韧谷院落。",
      amenities: ["studyRoom", "rainShelter", "watersideGuide"],
      images: ["/images/home/resilience-valley.webp"],
    },
  ] as const

  for (const courtyard of courtyards) {
    await prisma.courtyard.upsert({
      where: { id: courtyard.id },
      create: {
        id: courtyard.id,
        name: courtyard.name,
        sceneRealm: courtyard.sceneRealm,
        capacity: courtyard.capacity,
        status: courtyard.status,
        description: courtyard.description,
        amenities: courtyard.amenities,
        images: courtyard.images,
        priceRule: { weekday: 480, weekend: 680 },
      },
      update: {
        name: courtyard.name,
        sceneRealm: courtyard.sceneRealm,
        capacity: courtyard.capacity,
        status: courtyard.status,
        description: courtyard.description,
        amenities: courtyard.amenities,
        images: courtyard.images,
        priceRule: { weekday: 480, weekend: 680 },
      },
    })
  }
}

async function seedDemoTicketProducts() {
  const products = [
    ["ancient-road-pass", "古道半日导览票", "scenic", 30, 120, 18, "走马岭古道轻导览与指路碑讲述。"],
    ["lychee-class", "荔枝食育课堂票", "activity", 68, 80, 12, "亲子荔枝食育、采摘和分级体验。"],
    ["resilience-workshop", "韧谷水脉研学票", "activity", 88, 60, 8, "水脉观察、韧性设施和安全课程。"],
    ["ridge-courtyard-package", "岭上院落村宴套餐", "package", 198, 40, 6, "院落茶歇、村宴和晨间农事组合。"],
    ["family-rainy-package", "亲子雨天备用套餐", "package", 128, 50, 5, "雨天食育课堂、室内导览和手作活动。"],
    ["harvest-return-pass", "认养回访采摘票", "scenic", 48, 100, 10, "认养用户回访采摘和果品打包体验。"],
  ] as const

  for (const [id, name, category, price, totalStock, soldCount, description] of products) {
    await prisma.ticketProduct.upsert({
      where: { id },
      create: { id, name, category, price, totalStock, soldCount, description, status: "on_sale" },
      update: { name, category, price, totalStock, soldCount, description, status: "on_sale" },
    })
  }
}

async function seedDemoTasks(nodes: Record<string, string>) {
  const tasks = [
    ["demo-task-001", "荔枝园晨间巡检", "检查 LZ-018 与 LZ-026 周边土壤湿度。", "farming", "demo-villager-001", nodes["lychee-field-core"], "accepted", 48],
    ["demo-task-002", "古道入口导览支援", "协助亲子游客完成古道安全提示与路线说明。", "guiding", "demo-villager-002", nodes["ancient-road-core"], "pending", 60],
    ["demo-task-003", "岭上共居村宴备餐", "准备 12 人村宴食材与院落清洁。", "service", "demo-villager-003", nodes["ridge-dwelling-core"], "in_progress", 80],
    ["demo-task-004", "水位传感器复核", "复核 resilience-valley-core 水位探头数据。", "maintenance", "demo-villager-004", nodes["resilience-valley-core"], "pending", 55],
    ["demo-task-005", "认养树成长照片补拍", "为 LZ-041 补拍新梢记录照片。", "farming", "demo-villager-001", nodes["lychee-field-core"], "completed", 42],
  ] as const

  for (const [id, title, description, taskType, villagerId, nodeIdValue, status, earnings] of tasks) {
    await prisma.task.upsert({
      where: { id },
      create: {
        id,
        title,
        description,
        taskType,
        villagerId,
        nodeId: nodeIdValue,
        status,
        scheduledDate: demoDate,
        earnings,
      },
      update: {
        title,
        description,
        taskType,
        villagerId,
        nodeId: nodeIdValue,
        status,
        scheduledDate: demoDate,
        earnings,
      },
    })
  }
}

async function seedDemoDevices(nodes: Record<string, string>) {
  const devices = [
    ["demo-device-water-01", "water-level-01", "龙溪水位 01", "water_level", "active", nodes["resilience-valley-core"], "龙溪水岸"],
    ["demo-device-soil-01", "soil-moisture-01", "荔枝园土壤 01", "soil_moisture", "active", nodes["lychee-field-core"], "荔枝园核心区"],
    ["demo-device-weather-01", "weather-ancient-01", "古道微气象 01", "weather", "active", nodes["ancient-road-core"], "古道入口"],
    ["demo-device-gateway-01", "gateway-ridge-01", "岭上网关 01", "gateway", "maintenance", nodes["ridge-dwelling-core"], "岭上院落"],
  ] as const

  for (const [id, deviceId, name, type, status, nodeIdValue, location] of devices) {
    await prisma.device.upsert({
      where: { deviceId },
      create: {
        id,
        deviceId,
        name,
        type,
        status,
        nodeId: nodeIdValue,
        location,
        lastSeenAt: demoNow,
      },
      update: {
        name,
        type,
        status,
        nodeId: nodeIdValue,
        location,
        lastSeenAt: demoNow,
      },
    })
  }

  const readings = [
    ["demo-reading-001", "water-level-01", "water_level", 0.72, "m"],
    ["demo-reading-002", "soil-moisture-01", "soil_moisture", 28, "%"],
    ["demo-reading-003", "weather-ancient-01", "temperature", 31.4, "°C"],
    ["demo-reading-004", "weather-ancient-01", "air_humidity", 76, "%"],
    ["demo-reading-005", "gateway-ridge-01", "signal", 63, "%"],
  ] as const

  for (const [id, deviceId, type, value, unit] of readings) {
    await prisma.deviceReading.upsert({
      where: { id },
      create: { id, deviceId, type, value, unit, raw: { demo: true }, createdAt: demoNow },
      update: { type, value, unit, raw: { demo: true }, createdAt: demoNow },
    })
  }

  const sensorReadings = [
    ["demo-sensor-001", "water-level-01", "water_level", 0.72, "m", nodes["resilience-valley-core"]],
    ["demo-sensor-002", "soil-moisture-01", "soil_moisture", 28, "%", nodes["lychee-field-core"]],
    ["demo-sensor-003", "weather-ancient-01", "temperature", 31.4, "°C", nodes["ancient-road-core"]],
    ["demo-sensor-004", "weather-ancient-01", "air_humidity", 76, "%", nodes["ancient-road-core"]],
    ["demo-sensor-005", "gateway-ridge-01", "signal", 63, "%", nodes["ridge-dwelling-core"]],
  ] as const

  for (const [id, sensorId, type, value, unit, nodeIdValue] of sensorReadings) {
    await prisma.sensorReading.upsert({
      where: { id },
      create: { id, sensorId, type, value, unit, nodeId: nodeIdValue, createdAt: demoNow },
      update: { sensorId, type, value, unit, nodeId: nodeIdValue, createdAt: demoNow },
    })
  }

  await prisma.controlCommand.upsert({
    where: { id: "demo-device-health-prediction" },
    create: {
      id: "demo-device-health-prediction",
      commandType: "device_health_prediction",
      targetNodeId: nodes["ridge-dwelling-core"],
      priority: "medium",
      reason: "岭上网关信号低于 70%，建议现场复核供电与遮挡。",
      payload: { deviceId: "gateway-ridge-01", predictedStatus: "maintenance", confidence: 0.72 },
      status: "pending",
      triggeredBy: "demo_seed",
    },
    update: {
      priority: "medium",
      reason: "岭上网关信号低于 70%，建议现场复核供电与遮挡。",
      payload: { deviceId: "gateway-ridge-01", predictedStatus: "maintenance", confidence: 0.72 },
      status: "pending",
      triggeredBy: "demo_seed",
    },
  })

  await prisma.controlCommand.upsert({
    where: { id: "demo-control-water-level" },
    create: {
      id: "demo-control-water-level",
      commandType: "open_warning_sign",
      targetNodeId: nodes["resilience-valley-core"],
      priority: "high",
      reason: "龙溪水位接近亲水平台预警阈值，建议打开水岸提示牌。",
      payload: { threshold: 0.7, current: 0.72 },
      status: "pending",
      triggeredBy: "rule_engine",
    },
    update: {
      priority: "high",
      reason: "龙溪水位接近亲水平台预警阈值，建议打开水岸提示牌。",
      payload: { threshold: 0.7, current: 0.72 },
      status: "pending",
      triggeredBy: "rule_engine",
    },
  })
}

async function seedDemoActivities() {
  const activities = [
    ["demo-activity-food", "ridge-shared-courtyard", "food_class", "岭上村宴食育课", "围绕荔枝、山野菜和村宴故事的半日体验。", 16, 68, offsetChinaDate(demoDate, 6), "10:00"],
    ["demo-activity-harvest", "lychee-food-courtyard", "harvest", "荔枝采摘回访日", "认养人与亲子游客参与采摘、分级和打包。", 20, 88, offsetChinaDate(demoDate, 7), "15:00"],
  ] as const

  for (const [id, courtyardId, activityType, title, description, maxCapacity, price, scheduledDate, scheduledTime] of activities) {
    await prisma.courtyardActivity.upsert({
      where: { id },
      create: { id, courtyardId, activityType, title, description, maxCapacity, price, scheduledDate, scheduledTime, status: "open" },
      update: { courtyardId, activityType, title, description, maxCapacity, price, scheduledDate, scheduledTime, status: "open" },
    })
  }

  const bookings = [
    ["demo-activity-booking-001", "demo-activity-food", "林女士", "13800000001", 4],
    ["demo-activity-booking-002", "demo-activity-harvest", "王先生", "13800000002", 2],
  ] as const

  for (const [id, activityId, guestName, guestPhone, guestCount] of bookings) {
    await prisma.activityBooking.upsert({
      where: { id },
      create: { id, activityId, guestName, guestPhone, guestCount, status: "confirmed" },
      update: { activityId, guestName, guestPhone, guestCount, status: "confirmed" },
    })
  }
}

async function seedDemoOrders(nodes: Record<string, string>) {
  const orders = [
    ["demo-order-001", "product", "lychee-gift-box", "走马荔枝礼盒", 2, 336, nodes["lychee-field-core"], "demo-user-001"],
    ["demo-order-002", "activity_booking", "demo-activity-food", "岭上村宴食育课", 4, 272, nodes["ridge-dwelling-core"], "demo-user-001"],
    ["demo-order-003", "ticket_order", "ancient-road-pass", "古道半日票", 3, 90, nodes["ancient-road-core"], "demo-user-002"],
    ["demo-order-004", "activity_booking", "demo-activity-harvest", "荔枝采摘回访日", 2, 176, nodes["lychee-field-core"], "demo-user-001"],
    ["demo-order-005", "courtyard_booking", "ridge-meal-set", "岭上村宴预订", 1, 420, nodes["ridge-dwelling-core"], "demo-user-003"],
  ] as const

  for (const [id, orderType, productId, productName, quantity, totalAmount, nodeIdValue, userId] of orders) {
    await prisma.unifiedOrder.upsert({
      where: { id },
      create: {
        id,
        orderType,
        productId,
        productName,
        quantity,
        totalAmount,
        userId,
        nodeId: nodeIdValue,
        status: "paid",
        metadata: { demo: true },
      },
      update: {
        orderType,
        productId,
        productName,
        quantity,
        totalAmount,
        userId,
        nodeId: nodeIdValue,
        status: "paid",
        metadata: { demo: true },
      },
    })
  }
}

async function seedDemoTicketOrders() {
  const orders = [
    ["demo-ticket-order-001", "ancient-road-pass", "demo-user-002", 3, 90, "王先生", "138****0002", "paid"],
    ["demo-ticket-order-002", "lychee-class", "demo-user-001", 2, 136, "林女士", "138****0001", "pending_payment"],
  ] as const

  for (const [id, productId, userId, quantity, totalAmount, guestName, guestPhone, status] of orders) {
    await prisma.ticketOrder.upsert({
      where: { id },
      create: { id, productId, userId, quantity, totalAmount, guestName, guestPhone, status },
      update: { productId, userId, quantity, totalAmount, guestName, guestPhone, status },
    })
  }
}

async function seedDemoPaymentsAndConsents() {
  const payments = [
    ["demo-payment-pending", "ticket_order", "demo-ticket-order-002", "demo-user-001", 136, "pending"],
    ["demo-payment-paid", "ticket_order", "demo-ticket-order-001", "demo-user-002", 90, "paid"],
    ["demo-payment-adoption", "tree_adoption", "demo-adoption-001", "demo-user-001", 680, "paid"],
    ["demo-payment-expired", "courtyard_booking", "demo-order-expired", "demo-user-003", 240, "expired"],
    ["demo-payment-refunded", "activity_booking", "demo-order-refunded", "demo-user-001", 88, "refunded"],
  ] as const

  for (const [id, orderType, orderId, userId, amount, status] of payments) {
    await prisma.paymentOrder.upsert({
      where: { id },
      create: {
        id,
        orderType,
        orderId,
        userId,
        amount,
        status,
        channel: "mock_demo",
        idempotentKey: `${id}-idem`,
        paidAt: status === "paid" || status === "refunded" ? demoNow : null,
        expiresAt: status === "expired" ? demoNow : null,
      },
      update: {
        orderType,
        orderId,
        userId,
        amount,
        status,
        channel: "mock_demo",
        paidAt: status === "paid" || status === "refunded" ? demoNow : null,
        expiresAt: status === "expired" ? demoNow : null,
      },
    })
  }

  for (const consentType of ["privacy_policy", "data_collection", "ai_processing", "location"] as const) {
    await prisma.consentRecord.upsert({
      where: { userId_consentType: { userId: "demo-user-001", consentType } },
      create: { userId: "demo-user-001", consentType, granted: true, ipAddress: "127.0.0.1" },
      update: { granted: true, ipAddress: "127.0.0.1" },
    })
  }
}

async function seedDemoVisitorsAndScores(nodes: Record<string, string>) {
  for (const user of demoUsers) {
    await prisma.visitor.upsert({
      where: { fingerprint: `demo-${user.id}` },
      create: {
        id: `demo-visitor-${user.id}`,
        fingerprint: `demo-${user.id}`,
        userAgent: "Demo Browser",
        screenSize: "390x844",
        timezone: "Asia/Shanghai",
      },
      update: {
        userAgent: "Demo Browser",
        screenSize: "390x844",
        timezone: "Asia/Shanghai",
      },
    })
  }

  const presenceRows = [
    ["demo-presence-001", nodes["ancient-road-core"], "demo-visitor-demo-user-001", 42, 36],
    ["demo-presence-002", nodes["lychee-field-core"], "demo-visitor-demo-user-002", 58, 44],
    ["demo-presence-003", nodes["ridge-dwelling-core"], "demo-visitor-demo-user-003", 31, 52],
  ] as const

  for (const [id, nodeIdValue, visitorId, peopleCount, dwellAvgMin] of presenceRows) {
    await prisma.presenceLog.upsert({
      where: { id },
      create: { id, nodeId: nodeIdValue, visitorId, peopleCount, dwellAvgMin, timestamp: demoNow },
      update: { nodeId: nodeIdValue, visitorId, peopleCount, dwellAvgMin, timestamp: demoNow },
    })
  }

  const scores = [
    [nodes["ancient-road-core"], 126, 48, 34, 82, 18, "sunny"],
    [nodes["lychee-field-core"], 168, 64, 42, 91, 12, "sunny"],
    [nodes["resilience-valley-core"], 88, 33, 27, 74, 46, "rainy"],
    [nodes["ridge-dwelling-core"], 96, 38, 51, 79, 20, "sunny"],
  ] as const

  for (const [nodeIdValue, totalVisitors, peakPeopleCount, avgDwellMin, attractiveness, safetyRisk, weatherCondition] of scores) {
    await prisma.nodeDailyScore.upsert({
      where: { nodeId_date: { nodeId: nodeIdValue, date: demoDate } },
      create: { nodeId: nodeIdValue, date: demoDate, totalVisitors, peakPeopleCount, avgDwellMin, attractiveness, safetyRisk, weatherCondition },
      update: { totalVisitors, peakPeopleCount, avgDwellMin, attractiveness, safetyRisk, weatherCondition },
    })
  }
}

async function seedDemoTreeOperations() {
  const lz018 = await treeId("lz018")
  const lz026 = await treeId("lz026")

  const existingAdoption = await prisma.treeAdoption.findUnique({
    where: { id: "demo-adoption-001" },
    select: { id: true },
  })
  const adoptionData = {
    treeId: lz018,
    plan: "annual",
    adopterName: "林女士",
    adopterPhone: "138****0001",
    adopterId: "demo-user-001",
    rightsJson: { harvest: true, careLog: true, interaction: true },
    status: "active",
  }

  if (existingAdoption) {
    await prisma.treeAdoption.update({
      where: { id: existingAdoption.id },
      data: adoptionData,
    })
  } else {
    await prisma.treeAdoption.create({
      data: {
        id: "demo-adoption-001",
        ...adoptionData,
      },
    })
  }

  await prisma.orchardTree.update({
    where: { id: lz018 },
    data: { adoptStatus: "reserved" },
  })

  await prisma.treeCareLog.upsert({
    where: { id: "demo-care-log-001" },
    create: {
      id: "demo-care-log-001",
      treeId: lz018,
      logType: "watering",
      content: "完成晨间补水，树盘湿度恢复到 31%。",
      operator: "李桂兰",
      createdAt: demoNow,
    },
    update: {
      logType: "watering",
      content: "完成晨间补水，树盘湿度恢复到 31%。",
      operator: "李桂兰",
      createdAt: demoNow,
    },
  })

  await prisma.harvestBooking.upsert({
    where: { id: "demo-harvest-booking-001" },
    create: {
      id: "demo-harvest-booking-001",
      treeId: lz026,
      scheduledDate: offsetChinaDate(demoDate, 7),
      timeSlot: "15:00-17:00",
      guestCount: 3,
      guestName: "林女士",
      guestPhone: "13800000001",
      fruitDestination: "寄往重庆主城家庭地址",
      destinationNote: "保留一半现场品尝，一半冷链寄送。",
      status: "confirmed",
    },
    update: {
      treeId: lz026,
      scheduledDate: offsetChinaDate(demoDate, 7),
      timeSlot: "15:00-17:00",
      guestCount: 3,
      guestName: "林女士",
      guestPhone: "13800000001",
      fruitDestination: "寄往重庆主城家庭地址",
      destinationNote: "保留一半现场品尝，一半冷链寄送。",
      status: "confirmed",
    },
  })

  await prisma.harvestShipment.upsert({
    where: { harvestBookingId: "demo-harvest-booking-001" },
    create: {
      id: "demo-harvest-shipment-001",
      harvestBookingId: "demo-harvest-booking-001",
      recipientName: "林女士",
      recipientPhone: "13800000001",
      recipientAddress: "重庆市渝中区演示路 88 号",
      courier: "顺丰冷链",
      trackingNumber: `SF-DEMO-${compactDate(demoDate)}`,
      status: "shipped",
      shippedAt: demoNow,
    },
    update: {
      recipientName: "林女士",
      recipientPhone: "13800000001",
      recipientAddress: "重庆市渝中区演示路 88 号",
      courier: "顺丰冷链",
      trackingNumber: `SF-DEMO-${compactDate(demoDate)}`,
      status: "shipped",
      shippedAt: demoNow,
    },
  })

  const interactionTasks = [
    ["demo-interaction-001", "watering", "为 LZ-018 完成一次浇水", 20, "completed"],
    ["demo-interaction-002", "photo", "上传一张果树今日照片", 15, "pending"],
  ] as const

  for (const [id, taskType, title, points, status] of interactionTasks) {
    await prisma.visitorInteractionTask.upsert({
      where: { id },
      create: { id, adoptionId: "demo-adoption-001", treeId: lz018, taskType, title, points, status },
      update: { taskType, title, points, status },
    })
  }
}

async function seedDemoReportsAndRecommendations(nodes: Record<string, string>) {
  await prisma.dailyReport.upsert({
    where: { date: demoDate },
    create: {
      id: `demo-report-${compactDate(demoDate)}`,
      date: demoDate,
      title: "走马村云脑日报",
      summary: "今日荔枝园转化较高，水岸节点安全风险上升，建议将亲水区域导流到古道阴影段。",
      sections: [
        { title: "客流", content: "四境合计 478 人次，荔枝园峰值 64 人。" },
        { title: "运营", content: "活动订单 5 笔，村民任务完成 1 项、进行中 1 项。" },
      ],
      metrics: { visitors: 478, orders: 5, alerts: 2 },
      actionItems: [{ priority: "high", action: "复核水岸提示牌与临时护栏", deadline: "今日 16:00" }],
      status: "published",
      generatedAt: demoNow,
    },
    update: {
      title: "走马村云脑日报",
      summary: "今日荔枝园转化较高，水岸节点安全风险上升，建议将亲水区域导流到古道阴影段。",
      sections: [
        { title: "客流", content: "四境合计 478 人次，荔枝园峰值 64 人。" },
        { title: "运营", content: "活动订单 5 笔，村民任务完成 1 项、进行中 1 项。" },
      ],
      metrics: { visitors: 478, orders: 5, alerts: 2 },
      actionItems: [{ priority: "high", action: "复核水岸提示牌与临时护栏", deadline: "今日 16:00" }],
      status: "published",
      generatedAt: demoNow,
    },
  })

  const recommendations = [
    ["demo-rec-001", "maintenance", "resilience-valley-core", "水岸节点风险上升，建议打开临时导流。", ["打开提示牌", "通知周启明复核水位传感器"], 0.86],
    ["demo-rec-002", "inventory_alert", "lychee-field-core", "荔枝园停留高但订单转化仍可提升，建议追加认养讲解。", ["增加 15 分钟认养讲解", "向游客推送 LZ-018 成长记录"], 0.78],
    ["demo-rec-003", "crowd_diversion", "ridge-dwelling-core", "岭上村宴订单集中，建议提前安排备餐任务。", ["派发备餐任务", "确认院落库存"], 0.81],
  ] as const

  for (const [id, type, targetObject, message, actionSteps, confidence] of recommendations) {
    await prisma.recommendation.upsert({
      where: { id },
      create: {
        id,
        bizDate: demoDate,
        type,
        targetObject,
        evidenceJson: { nodeId: nodes[targetObject], demo: true },
        message,
        actionSteps,
        ownerRole: "operator",
        expectedImpact: "提升展示完整度并保障现场安全。",
        confidence,
        status: "draft",
      },
      update: {
        bizDate: demoDate,
        type,
        targetObject,
        evidenceJson: { nodeId: nodes[targetObject], demo: true },
        message,
        actionSteps,
        ownerRole: "operator",
        expectedImpact: "提升展示完整度并保障现场安全。",
        confidence,
        status: "draft",
      },
    })
  }

  const alerts = [
    ["demo-alert-001", "water_level", nodes["resilience-valley-core"], "high", "龙溪亲水点水位接近预警阈值。"],
    ["demo-alert-002", "device_health", nodes["ridge-dwelling-core"], "medium", "岭上网关信号偏低，建议复核。"],
  ] as const

  for (const [id, alertType, nodeIdValue, severity, message] of alerts) {
    await prisma.alert.upsert({
      where: { id },
      create: { id, alertType, nodeId: nodeIdValue, severity, message, status: "active", createdAt: demoNow },
      update: { alertType, nodeId: nodeIdValue, severity, message, status: "active", createdAt: demoNow },
    })
  }
}

async function seedDemoNotifications() {
  const notifications = [
    ["demo-notification-001", "villager", "demo-villager-001", "新的果树养护任务", "请在 11:00 前完成 LZ-018 浇水复核。", "task"],
    ["demo-notification-002", "tourist", "138****0001", "你的认养树有新记录", "LZ-018 今日已完成补水并上传养护日志。", "tree"],
    ["demo-notification-003", "operator", "admin", "水岸安全预警", "resilience-valley-core 水位接近阈值，请安排现场复核。", "alert"],
  ] as const

  for (const [id, recipientType, recipientId, title, body, category] of notifications) {
    await prisma.notification.upsert({
      where: { id },
      create: { id, recipientType, recipientId, title, body, category, channel: "in_app", isRead: false },
      update: { recipientType, recipientId, title, body, category, channel: "in_app", isRead: false },
    })
  }
}

async function seedDemoRoutes() {
  await prisma.routePlan.upsert({
    where: { id: "demo-route-plan-001" },
    create: {
      id: "demo-route-plan-001",
      userId: "demo-user-001",
      inputsJson: { duration: "halfDay", audience: "family", weather: "sunny" },
      outputJson: { routeId: "familyHalfDay", waypoints: ["visitor-center", "lychee-garden", "food-classroom"] },
      weatherSnapshotId: `demo-weather-${compactDate(demoDate)}`,
    },
    update: {
      inputsJson: { duration: "halfDay", audience: "family", weather: "sunny" },
      outputJson: { routeId: "familyHalfDay", waypoints: ["visitor-center", "lychee-garden", "food-classroom"] },
      weatherSnapshotId: `demo-weather-${compactDate(demoDate)}`,
    },
  })

  await prisma.routeGenerationLog.upsert({
    where: { id: "demo-route-log-001" },
    create: {
      id: "demo-route-log-001",
      routeId: "familyHalfDay",
      duration: "halfDay",
      audience: "family",
      weather: "sunny",
      provider: "fallback",
      createdAt: demoNow,
    },
    update: {
      routeId: "familyHalfDay",
      duration: "halfDay",
      audience: "family",
      weather: "sunny",
      provider: "fallback",
      createdAt: demoNow,
    },
  })
}

function offsetChinaDate(date: string, days: number) {
  const base = new Date(`${date}T00:00:00.000+08:00`)
  base.setUTCDate(base.getUTCDate() + days)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(base)
}

function compactDate(date: string) {
  return date.replaceAll("-", "")
}
