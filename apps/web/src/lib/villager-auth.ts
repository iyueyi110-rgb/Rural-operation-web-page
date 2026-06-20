const TOKEN_PREFIX = "villager_"
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function createVillagerToken(villagerId: string, timestamp = Date.now()) {
  return `${TOKEN_PREFIX}${Buffer.from(`${villagerId}_${timestamp}`, "utf-8").toString("base64")}`
}

export function getVillagerIdFromToken(request: Request, now = Date.now()): string | null {
  const token = request.headers.get("X-Villager-Token")
  if (!token?.startsWith(TOKEN_PREFIX)) return null

  try {
    const decoded = Buffer.from(token.slice(TOKEN_PREFIX.length), "base64").toString("utf-8")
    const [id, timestampValue, ...extra] = decoded.split("_")
    const timestamp = Number(timestampValue)

    if (!id || !timestampValue || extra.length > 0 || !Number.isFinite(timestamp)) return null
    if (timestamp > now || now - timestamp > TOKEN_MAX_AGE_MS) return null
    return id
  } catch {
    return null
  }
}
