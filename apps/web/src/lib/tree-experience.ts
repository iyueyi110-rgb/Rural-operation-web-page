export type SensorDisplayStatus = "active" | "warning" | "inactive"
export type GrowthStage = "flowering" | "fruiting" | "ripening" | "harvest"

export const growthStages: GrowthStage[] = [
  "flowering",
  "fruiting",
  "ripening",
  "harvest",
]

interface SensorReadingInput {
  type: string
  value: number
  unit: string
}

interface EnvironmentMetric {
  id: "soilMoisture" | "airHumidity" | "lightIntensity"
  value: number
  unit: string
  max: number
  isBaseline: boolean
}

const metricDefinitions = [
  {
    id: "soilMoisture" as const,
    types: ["soil_moisture", "soilMoisture"],
    baseline: 58,
    unit: "%",
    max: 100,
  },
  {
    id: "airHumidity" as const,
    types: ["humidity", "air_humidity", "airHumidity"],
    baseline: 71,
    unit: "%",
    max: 100,
  },
  {
    id: "lightIntensity" as const,
    types: ["light", "light_intensity", "illuminance"],
    baseline: 36,
    unit: "klux",
    max: 80,
  },
]

export function normalizeSensorStatus(value: unknown): SensorDisplayStatus {
  if (value === "active" || value === "inactive") return value
  return "warning"
}

export function shouldDisplaySensorValues(
  status: SensorDisplayStatus,
  loading: boolean,
) {
  return !loading && status !== "inactive"
}

export function buildEnvironmentMetrics(
  readings: SensorReadingInput[],
  status: SensorDisplayStatus,
): EnvironmentMetric[] {
  return metricDefinitions.map((definition) => {
    const reading =
      status === "active"
        ? readings.find((item) => definition.types.includes(item.type))
        : undefined

    return {
      id: definition.id,
      value:
        reading && Number.isFinite(reading.value)
          ? reading.value
          : definition.baseline,
      unit: reading?.unit || definition.unit,
      max: definition.max,
      isBaseline: !reading,
    }
  })
}

export interface AdoptionRights {
  harvestQuota: string
  onsiteBooking: boolean
  nameplate: boolean
  coldChain: boolean
}

export function normalizeAdoptionRights(
  value: unknown,
  plan: string,
): AdoptionRights {
  const record = isPlainObject(value) ? value : {}
  const rawQuota = record.harvestQuota
  const harvestQuota =
    typeof rawQuota === "string" && rawQuota.trim()
      ? rawQuota.trim()
      : typeof rawQuota === "number" && Number.isFinite(rawQuota)
        ? `${rawQuota} kg`
        : plan === "seasonal"
          ? "5 kg"
          : "10 kg"

  return {
    harvestQuota,
    onsiteBooking: record.onsiteBooking !== false,
    nameplate: record.nameplate !== false,
    coldChain: record.coldChain !== false,
  }
}

export function getRightsVisualState(status: string) {
  if (status === "active") return "unlocked" as const
  if (status === "pending_payment") return "locked" as const
  return "preview" as const
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
