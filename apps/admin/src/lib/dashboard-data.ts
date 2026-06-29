export interface VillagerMetric {
  status: string
}

export interface CompletedTaskMetric {
  earnings: number
}

export interface ConsumptionMetric {
  totalAmount: number
  orderCount: number
}

export interface PresenceMetric {
  peopleCount: number
}

export interface FeedbackMetric {
  rating: number
  severity: string
}

export interface ProductMetric {
  stockStatus: string
}

export interface SensorMetric {
  id: string
  type: string
  value: number
  unit: string
  createdAt: string
}

export function summarizeProduction(
  villagers: VillagerMetric[],
  completedTasks: CompletedTaskMetric[],
) {
  return {
    activeVillagers: villagers.filter(
      (villager) => villager.status === "active",
    ).length,
    completedTasks: completedTasks.length,
    completedEarnings: completedTasks.reduce(
      (total, task) => total + finiteNumber(task.earnings),
      0,
    ),
  }
}

export function summarizeVisitorBehavior(
  consumption: ConsumptionMetric[],
  presence: PresenceMetric[],
) {
  const peopleCounts = presence.map((item) => finiteNumber(item.peopleCount))

  return {
    currentVisitors: peopleCounts.at(-1) ?? 0,
    peakVisitors: peopleCounts.length ? Math.max(...peopleCounts) : 0,
    orderCount: consumption.reduce(
      (total, item) => total + finiteNumber(item.orderCount),
      0,
    ),
    revenue: consumption.reduce(
      (total, item) => total + finiteNumber(item.totalAmount),
      0,
    ),
  }
}

export function summarizeProductFeedback(
  feedback: FeedbackMetric[],
  products: ProductMetric[],
) {
  const ratingTotal = feedback.reduce(
    (total, item) => total + finiteNumber(item.rating),
    0,
  )

  return {
    averageRating: feedback.length ? ratingTotal / feedback.length : 0,
    urgentFeedback: feedback.filter((item) =>
      ["high", "urgent"].includes(item.severity),
    ).length,
    availableProducts: products.filter(
      (product) => product.stockStatus === "available",
    ).length,
    productCount: products.length,
  }
}

export function normalizeEcologySensors(sensors: SensorMetric[]) {
  const priority = ["soil_moisture", "humidity", "water_level", "temperature"]
  const latestByType = new Map<string, SensorMetric>()

  for (const sensor of sensors) {
    const type = normalizeSensorType(sensor.type)
    if (!priority.includes(type)) continue

    const normalizedSensor = { ...sensor, type }
    const existing = latestByType.get(type)
    if (!existing || Date.parse(normalizedSensor.createdAt) > Date.parse(existing.createdAt)) {
      latestByType.set(type, normalizedSensor)
    }
  }

  return [...latestByType.values()].sort(
    (first, second) => priority.indexOf(first.type) - priority.indexOf(second.type),
  )
}

export function buildSparklinePath(values: number[], width = 220, height = 48) {
  if (!values.length) return ""

  const safeValues = values.map(finiteNumber)
  const minimum = Math.min(...safeValues)
  const maximum = Math.max(...safeValues)
  const range = maximum - minimum
  const step = safeValues.length > 1 ? width / (safeValues.length - 1) : 0

  return safeValues
    .map((value, index) => {
      const x = round(index * step)
      const y = round(
        range ? height - ((value - minimum) / range) * height : height / 2,
      )
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
}

export function formatEvidenceEntries(value: unknown) {
  if (!isRecord(value)) return []

  return Object.entries(value).map(([label, entry]) => ({
    label,
    value: formatEvidenceValue(entry),
  }))
}

function formatEvidenceValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatEvidenceValue).join("、")
  if (isRecord(value)) return JSON.stringify(value)
  if (value === null || value === undefined) return "-"
  return String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function normalizeSensorType(type: string) {
  if (type === "air_humidity") return "humidity"
  return type
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
