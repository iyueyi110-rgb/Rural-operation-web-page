import type { InteractionTaskType } from "@zouma/contracts"

export const interactionTaskTypes = [
  "watering",
  "fertilizing",
  "photo_upload",
  "diary",
  "share",
] as const

export type { InteractionTaskType }

const interactionPoints: Record<InteractionTaskType, number> = {
  watering: 10,
  fertilizing: 10,
  photo_upload: 15,
  diary: 20,
  share: 15,
}

const interactionRepeatCounts: Record<InteractionTaskType, number> = {
  watering: 4,
  fertilizing: 1,
  photo_upload: 1,
  diary: 1,
  share: 1,
}

export function isInteractionTaskType(
  value: unknown,
): value is InteractionTaskType {
  return (
    typeof value === "string" &&
    interactionTaskTypes.includes(value as InteractionTaskType)
  )
}

export function getInteractionPoints(taskType: InteractionTaskType) {
  return interactionPoints[taskType]
}

export function getInteractionRepeatCount(taskType: InteractionTaskType) {
  return interactionRepeatCounts[taskType]
}
