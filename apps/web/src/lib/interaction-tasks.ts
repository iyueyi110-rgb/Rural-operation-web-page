export const interactionTaskTypes = [
  "watering",
  "fertilizing",
  "photo_upload",
  "diary",
  "share",
] as const

export type InteractionTaskType = (typeof interactionTaskTypes)[number]

const interactionPoints: Record<InteractionTaskType, number> = {
  watering: 10,
  fertilizing: 10,
  photo_upload: 15,
  diary: 20,
  share: 15,
}

export function isInteractionTaskType(value: unknown): value is InteractionTaskType {
  return (
    typeof value === "string" &&
    interactionTaskTypes.includes(value as InteractionTaskType)
  )
}

export function getInteractionPoints(taskType: InteractionTaskType) {
  return interactionPoints[taskType]
}
