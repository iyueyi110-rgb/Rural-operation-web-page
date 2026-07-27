import { getRedis } from "@zouma/database"

const LOCK_PREFIX = "adoption_lock:"
const LOCK_TTL_SECONDS = 120
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`

export function buildAdoptionLockKey(treeId: string) {
  return `${LOCK_PREFIX}${treeId}`
}

export function createAdoptionLockValue(
  userId: string,
  timestamp = Date.now(),
) {
  return `${userId}_${timestamp}`
}

export function isRedisUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false
  return /ECONNREFUSED|ETIMEDOUT|Connection is closed|Stream isn't writeable|enableOfflineQueue/i.test(
    error.message,
  )
}

export async function acquireAdoptionLock(treeId: string, userId: string) {
  const redis = getRedis()
  if (redis.status === "wait") await redis.connect()

  const token = createAdoptionLockValue(userId)
  const result = await redis.set(
    buildAdoptionLockKey(treeId),
    token,
    "EX",
    LOCK_TTL_SECONDS,
    "NX",
  )
  return result === "OK" ? token : null
}

export async function releaseAdoptionLock(treeId: string, token: string) {
  const redis = getRedis()
  if (redis.status === "wait") await redis.connect()
  await redis.eval(RELEASE_SCRIPT, 1, buildAdoptionLockKey(treeId), token)
}
