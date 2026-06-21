export const zoumaVillageCenter: [number, number] = [29.8255, 107.067]
export const zoumaVillageLabel = "重庆市长寿区凤城街道走马村"

const legacyCenter = [29.8512, 106.321] as const
const legacyFrameRadius = 0.12

export function normalizeZoumaVillageCoordinate(lat: number, lng: number) {
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
