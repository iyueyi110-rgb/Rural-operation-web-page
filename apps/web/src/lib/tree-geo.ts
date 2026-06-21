export function toGridId(lat: number, lng: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("Invalid tree coordinates")
  }

  const gridLat = Math.round(lat * 1000) % 100
  const gridLng = Math.round(lng * 1000) % 100
  return `网格_${gridLat}_${gridLng}`
}

export function resolveTreeHiddenGeo(
  hiddenGeo: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
) {
  const persisted = hiddenGeo?.trim()
  if (persisted) return persisted
  if (typeof lat !== "number" || typeof lng !== "number") return undefined

  try {
    return toGridId(lat, lng)
  } catch {
    return undefined
  }
}
