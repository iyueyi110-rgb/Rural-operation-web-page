import "server-only"

export interface ScoringInput {
  totalVisitors: number
  peakPeopleCount: number
  avgDwellMin: number
  revisitIndex: number
  terrainRisk: number
  watersideRisk: number
  capacity: number
  weatherCondition: string
}

export interface ScoringOutput {
  attractiveness: number
  safetyRisk: number
}

export function computeScores(input: ScoringInput): ScoringOutput {
  const normalizedDwell = Math.min(input.avgDwellMin / 120, 1)
  const normalizedVisitors = Math.min(input.totalVisitors / 500, 1)
  const normalizedPeak = Math.min(input.peakPeopleCount / Math.max(input.capacity, 1), 1)

  const attractiveness =
    Math.round(
      (normalizedVisitors * 0.3 +
        normalizedPeak * 0.2 +
        normalizedDwell * 0.3 +
        Math.min(input.revisitIndex, 1) * 0.2) *
        100 *
        100,
    ) / 100

  const weatherFactor =
    input.weatherCondition === "rainy" ? 0.3 : input.weatherCondition === "hot" ? 0.2 : 0
  const densityFactor = Math.min(input.peakPeopleCount / Math.max(input.capacity, 1), 1)

  const safetyRisk =
    Math.round(
      (input.terrainRisk * 0.2 +
        input.watersideRisk * 0.2 +
        weatherFactor * 0.35 +
        densityFactor * 0.25) *
        100 *
        100,
    ) / 100

  return { attractiveness, safetyRisk }
}
