import { prisma } from "../src/index"
import { seedNodes } from "./seed-nodes"
import { seedProducts } from "./seed-products"
import { seedFarmingCalendar } from "./seed-farming-calendar"
import { seedTrees } from "./seed-trees"
import { seedDemoData } from "./seed-demo"
import { seedRenovation } from "./seed-renovation"

const seedTickets = [
  {
    id: "FB-20260612-001",
    category: "facility",
    severity: "medium",
    content: "游客中心到陶家湾停车点的指示牌还可以更明显，老人找路时需要工作人员二次说明。",
    rating: 4,
    status: "processing",
    source: "web",
    createdAt: new Date("2026-06-12T09:20:00.000+08:00"),
    updatedAt: new Date("2026-06-12T10:10:00.000+08:00"),
    handlingRecords: [
      {
        id: "HR-001",
        status: "submitted",
        note: "前台反馈已入库。",
        operator: "系统",
        createdAt: new Date("2026-06-12T09:20:00.000+08:00"),
      },
      {
        id: "HR-002",
        status: "processing",
        note: "已转给现场运营核对导视位置。",
        operator: "运营值班",
        createdAt: new Date("2026-06-12T10:10:00.000+08:00"),
      },
    ],
  },
  {
    id: "FB-20260612-002",
    category: "service",
    severity: "low",
    content: "荔枝树认养讲解很清晰，希望后续能增加采摘活动提醒。",
    rating: 5,
    status: "submitted",
    source: "web",
    createdAt: new Date("2026-06-12T11:05:00.000+08:00"),
    updatedAt: new Date("2026-06-12T11:05:00.000+08:00"),
    handlingRecords: [
      {
        id: "HR-003",
        status: "submitted",
        note: "前台反馈已入库。",
        operator: "系统",
        createdAt: new Date("2026-06-12T11:05:00.000+08:00"),
      },
    ],
  },
]

const seedVillagers = [
  {
    id: "villager-dev-001",
    name: "李桂兰",
    phone: "17732954821",
    skills: ["farming", "logistics"],
    nodeSlug: "lychee-field-core",
  },
  {
    id: "villager-dev-002",
    name: "张德明",
    phone: "13900001111",
    skills: ["guiding", "handicraft"],
    nodeSlug: "ancient-road-core",
  },
  {
    id: "villager-dev-003",
    name: "陈素芬",
    phone: "13900002222",
    skills: ["cooking", "logistics"],
    nodeSlug: "ridge-dwelling-core",
  },
]

async function seedFeedbackTickets() {
  await prisma.feedbackHandlingRecord.deleteMany({
    where: {
      ticketId: {
        in: seedTickets.map((ticket) => ticket.id),
      },
    },
  })
  await prisma.feedbackTicket.deleteMany({
    where: {
      id: {
        in: seedTickets.map((ticket) => ticket.id),
      },
    },
  })

  for (const ticket of seedTickets) {
    await prisma.feedbackTicket.create({
      data: {
        id: ticket.id,
        category: ticket.category,
        severity: ticket.severity,
        content: ticket.content,
        rating: ticket.rating,
        status: ticket.status,
        source: ticket.source,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        handlingRecords: {
          create: ticket.handlingRecords,
        },
      },
    })
  }
}

async function seedVillagerAccounts() {
  for (const villager of seedVillagers) {
    const node = await prisma.spaceNode.findUnique({
      where: { slug: villager.nodeSlug },
      select: { id: true },
    })
    const existingVillager = await prisma.villager.findFirst({
      where: { phone: villager.phone },
      select: { id: true },
    })

    if (existingVillager) {
      await prisma.villager.update({
        where: { id: existingVillager.id },
        data: {
          name: villager.name,
          skills: villager.skills,
          nodeId: node?.id,
          status: "active",
        },
      })
      continue
    }

    await prisma.villager.create({
      data: {
        id: villager.id,
        name: villager.name,
        phone: villager.phone,
        skills: villager.skills,
        nodeId: node?.id,
        status: "active",
      },
    })
  }
}

async function main() {
  await seedFeedbackTickets()
  await seedNodes()
  await seedVillagerAccounts()
  await seedTrees()
  await seedProducts()
  await seedFarmingCalendar()
  await seedDemoData()
  await seedRenovation()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
