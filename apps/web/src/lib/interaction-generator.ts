import { prisma } from "@zouma/database"

import {
  getInteractionPoints,
  getInteractionRepeatCount,
  type InteractionTaskType,
} from "@web/lib/interaction-tasks"

interface InteractionTaskDraft {
  taskType: InteractionTaskType
  title: string
  description: string
  maxCompletions: number
}

export function buildInteractionTaskDrafts(
  harvestSeason: string | null,
): InteractionTaskDraft[] {
  const season = harvestSeason?.trim() || "当前生长季"

  return [
    {
      taskType: "watering",
      title: "本月浇水",
      description: `${season}养护任务：完成每周浇水并记录树木状态。`,
      maxCompletions: getInteractionRepeatCount("watering"),
    },
    {
      taskType: "fertilizing",
      title: "本月施肥",
      description: `${season}养护任务：完成一次施肥并记录用量。`,
      maxCompletions: getInteractionRepeatCount("fertilizing"),
    },
    {
      taskType: "photo_upload",
      title: "上传成长照片",
      description: `${season}养护任务：拍摄并上传一张果树成长照片。`,
      maxCompletions: getInteractionRepeatCount("photo_upload"),
    },
    {
      taskType: "diary",
      title: "记录养护日记",
      description: `${season}养护任务：写下本月的果树变化与养护观察。`,
      maxCompletions: getInteractionRepeatCount("diary"),
    },
    {
      taskType: "share",
      title: "分享果树成长",
      description: `${season}养护任务：把认养果树的成长分享给朋友。`,
      maxCompletions: getInteractionRepeatCount("share"),
    },
  ]
}

export async function generateInteractionTasks(
  adoptionId: string,
  treeId: string,
) {
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
      pointsPerCompletion: getInteractionPoints(task.taskType),
    })),
  })
}
