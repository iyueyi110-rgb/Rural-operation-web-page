import { prisma } from "../src/index"

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

async function main() {
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

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
