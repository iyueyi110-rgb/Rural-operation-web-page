import type { PrismaClient } from "@prisma/client"

const adoptionCode = "ADOPT-2026-LZ018-001"
const taskId = "DEMO-LZ018-CARE-001"

export async function seedAdoptionFulfillment(prisma: PrismaClient) {
  const tree = await prisma.orchardTree.findFirstOrThrow({
    where: { treeCode: "lz018" },
  })
  const villager = await prisma.villager.findFirstOrThrow({
    where: { id: "demo-villager-001" },
  })
  const user = await prisma.user.findFirst({ where: { id: "demo-user-001" } })

  const adoption = await prisma.treeAdoption.upsert({
    where: { adoptionCode },
    create: {
      id: "demo-adoption-lz018-v2",
      adoptionCode,
      treeId: tree.id,
      plan: "annual",
      adopterName: "Demo 认养人",
      adopterPhone: "138****0180",
      adopterId: user?.id,
      rightsJson: { demo: true, harvest: true, delivery: true },
      status: "fulfilled",
    },
    update: {
      treeId: tree.id,
      adopterId: user?.id,
      status: "fulfilled",
      rightsJson: { demo: true, harvest: true, delivery: true },
    },
  })
  const adoptionId = adoption.id

  await prisma.task.upsert({
    where: { id: taskId },
    create: {
      id: taskId,
      title: "Demo｜LZ018 首月养护",
      description: "模拟完成树体巡查和基础养护，保留退回重提版本。",
      taskType: "farming",
      status: "approved",
      villagerId: villager.id,
      nodeId: villager.nodeId,
      adoptionId,
      treeId: tree.id,
      deadlineAt: new Date("2026-07-15T09:00:00+08:00"),
      acceptedAt: new Date("2026-07-10T08:00:00+08:00"),
      submittedAt: new Date("2026-07-12T10:30:00+08:00"),
      completedAt: new Date("2026-07-13T16:20:00+08:00"),
      evidenceRequirements: { demo: true, minImages: 2 },
      earnings: 48,
    },
    update: {
      adoptionId,
      treeId: tree.id,
      villagerId: villager.id,
      status: "approved",
      version: 3,
    },
  })

  await prisma.task.upsert({
    where: { id: "DEMO-LZ018-RISK-001" },
    create: {
      id: "DEMO-LZ018-RISK-001",
      title: "Demo｜LZ018 下一次养护待接取",
      description: "用于履约协调 Agent 影子模式的待接取风险样本。",
      taskType: "farming",
      status: "pending",
      adoptionId,
      treeId: tree.id,
      nodeId: villager.nodeId,
      deadlineAt: new Date("2026-07-21T09:00:00+08:00"),
      evidenceRequirements: { demo: true, minImages: 2 },
      earnings: 48,
    },
    update: {
      adoptionId,
      treeId: tree.id,
      status: "pending",
      villagerId: null,
      deadlineAt: new Date("2026-07-21T09:00:00+08:00"),
    },
  })

  const evidenceRows = [
    {
      id: "DEMO-LZ018-EVIDENCE-001",
      version: 1,
      status: "rejected",
      description: "Demo｜首次提交，图片无法清晰识别养护结果。",
      mediaJson: [
        {
          url: "/images/trees/lz018.webp",
          hash: "1".repeat(64),
          mimeType: "image/webp",
          size: 277474,
          demo: true,
        },
        {
          url: "/images/trees/lz018.webp",
          hash: "2".repeat(64),
          mimeType: "image/webp",
          size: 277474,
          demo: true,
        },
      ],
      submittedAt: new Date("2026-07-11T15:00:00+08:00"),
    },
    {
      id: "DEMO-LZ018-EVIDENCE-002",
      version: 2,
      status: "approved",
      description: "Demo｜补充清晰的养护对象与操作结果图片。",
      mediaJson: [
        {
          url: "/images/trees/lz018-feizixiao-v2.webp",
          hash: "3".repeat(64),
          mimeType: "image/webp",
          size: 547814,
          demo: true,
        },
        {
          url: "/images/trees/lz018-feizixiao.webp",
          hash: "4".repeat(64),
          mimeType: "image/webp",
          size: 412532,
          demo: true,
        },
      ],
      submittedAt: new Date("2026-07-12T10:30:00+08:00"),
    },
  ]
  for (const evidence of evidenceRows) {
    await prisma.fulfillmentEvidence.upsert({
      where: { id: evidence.id },
      create: { ...evidence, adoptionId, taskId, submittedBy: villager.id },
      update: evidence,
    })
  }

  await prisma.fulfillmentReview.upsert({
    where: { id: "DEMO-LZ018-REVIEW-001" },
    create: {
      id: "DEMO-LZ018-REVIEW-001",
      evidenceId: "DEMO-LZ018-EVIDENCE-001",
      reviewerId: "Demo 运营员 B",
      decision: "reject",
      reasonCode: "image_blurry",
      note: "图片模糊，请补充可识别养护结果的照片。",
      createdAt: new Date("2026-07-11T17:00:00+08:00"),
    },
    update: {
      decision: "reject",
      reasonCode: "image_blurry",
      note: "图片模糊，请补充可识别养护结果的照片。",
    },
  })
  await prisma.fulfillmentReview.upsert({
    where: { id: "DEMO-LZ018-REVIEW-002" },
    create: {
      id: "DEMO-LZ018-REVIEW-002",
      evidenceId: "DEMO-LZ018-EVIDENCE-002",
      reviewerId: "Demo 运营员 B",
      decision: "approve",
      note: "补充材料符合 Demo 养护要求。",
      createdAt: new Date("2026-07-13T16:20:00+08:00"),
    },
    update: { decision: "approve", note: "补充材料符合 Demo 养护要求。" },
  })

  await prisma.adoptionBenefit.upsert({
    where: {
      adoptionId_benefitKey: { adoptionId, benefitKey: "DEMO-HARVEST-2026" },
    },
    create: {
      adoptionId,
      benefitKey: "DEMO-HARVEST-2026",
      type: "delivery",
      status: "confirmed",
      detailsJson: { demo: true, label: "Demo 采摘配送权益" },
      selectedAt: new Date("2026-07-14T09:00:00+08:00"),
      fulfilledAt: new Date("2026-07-16T14:00:00+08:00"),
      confirmedAt: new Date("2026-07-17T10:00:00+08:00"),
    },
    update: {
      status: "confirmed",
      detailsJson: { demo: true, label: "Demo 采摘配送权益" },
    },
  })
  await prisma.fulfillmentSettlement.upsert({
    where: { taskId },
    create: {
      id: "DEMO-LZ018-SETTLEMENT-001",
      adoptionId,
      taskId,
      villagerId: villager.id,
      amount: 48,
      status: "approved",
      approvedBy: "Demo 运营员 B",
      approvedAt: new Date("2026-07-18T09:00:00+08:00"),
    },
    update: {
      status: "approved",
      approvedBy: "Demo 运营员 B",
      approvedAt: new Date("2026-07-18T09:00:00+08:00"),
    },
  })
  await prisma.adoptionRenewal.upsert({
    where: { previousAdoptionId: adoptionId },
    create: {
      previousAdoptionId: adoptionId,
      status: "pending",
      dueAt: new Date("2027-06-20T00:00:00+08:00"),
    },
    update: { status: "pending", dueAt: new Date("2027-06-20T00:00:00+08:00") },
  })
}
