import { prisma } from "@zouma/database"

import type { InteractionTaskType } from "@web/lib/interaction-tasks"

interface InteractionTaskDraft {
  taskType: InteractionTaskType
  title: string
  description: string
}

export function buildInteractionTaskDrafts(harvestSeason: string | null): InteractionTaskDraft[] {
  const season = harvestSeason?.trim() || "当前生长季"
  const watering = Array.from({ length: 4 }, (_, index) => ({
    taskType: "watering" as const,
    title: `第 ${index + 1} 周浇水`,
    description: `${season}养护任务：完成本周浇水并记录树木状态。`,
  }))

  return [
    ...watering,
    {
      taskType: "fertilizing",
      title: "本月施肥",
      description: `${season}养护任务：完成一次施肥并记录用量。`,
    },
    {
      taskType: "photo_upload",
      title: "上传成长照片",
      description: `${season}养护任务：拍摄并上传一张果树成长照片。`,
    },
    {
      taskType: "diary",
      title: "记录养护日记",
      description: `${season}养护任务：写下本月的果树变化与养护观察。`,
    },
  ]
}

export async function generateInteractionTasks(adoptionId: string, treeId: string) {
  const existing = await prisma.visitorInteractionTask.findFirst({
    where: { adoptionId, status: "pending" },
    select: { id: true },
  })
  if (existing) return { count: 0 }

  const tree = await prisma.orchardTree.findUnique({
    where: { id: treeId },
    select: { harvestSeason: true },
  })
  if (!tree) throw new Error("Orchard tree not found")

  return prisma.visitorInteractionTask.createMany({
    data: buildInteractionTaskDrafts(tree.harvestSeason).map((task) => ({
      adoptionId,
      treeId,
      ...task,
    })),
  })
}
