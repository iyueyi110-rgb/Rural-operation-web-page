export const zoumaVillageCenter: [number, number] = [29.8105, 107.1055]
export const zoumaVillageLabel = "重庆市长寿区凤城街道走马村"

const nodePositionsInZoumaRange: Record<string, [number, number]> = {
  "visitor-center": [29.8062, 107.102],
  taojiawan: [29.8075, 107.1038],
  "ancient-road": [29.8087, 107.106],
  "indoor-story": [29.8099, 107.1082],
  "shaded-ancient-road": [29.811, 107.1105],
  "lychee-garden": [29.807, 107.1096],
  "food-classroom": [29.8049, 107.1081],
  "tree-adoption": [29.8033, 107.1066],
  "waterfront-rest": [29.8014, 107.1052],
  "resilience-workshop": [29.7996, 107.104],
  "ridge-courtyard": [29.8061, 107.1125],
  "village-meal": [29.8043, 107.114],
  "morning-farm": [29.8026, 107.1152],
  "ancient-road-core": [29.8081, 107.105],
  "lychee-field-core": [29.8054, 107.107],
  "resilience-valley-core": [29.8008, 107.1054],
  "ridge-dwelling-core": [29.8053, 107.1133],
}

const legacyCenter = [29.8512, 106.321] as const
const legacyFrameRadius = 0.12

export function normalizeZoumaVillageCoordinate(
  lat: number,
  lng: number,
  slug?: string,
) {
  if (slug && nodePositionsInZoumaRange[slug]) {
    return nodePositionsInZoumaRange[slug]
  }

  const isLegacyCoordinate =
    Math.abs(lat - legacyCenter[0]) < legacyFrameRadius &&
    Math.abs(lng - legacyCenter[1]) < legacyFrameRadius

  if (!isLegacyCoordinate) return [lat, lng] as [number, number]

  return [
    roundCoordinate(lat + zoumaVillageCenter[0] - legacyCenter[0]),
    roundCoordinate(lng + zoumaVillageCenter[1] - legacyCenter[1]),
  ] as [number, number]
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}
