import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis?: Redis }

export function getRedis() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
    globalForRedis.redis.on("error", (error) => {
      console.warn("Redis connection error:", error.message)
    })
  }

  return globalForRedis.redis
}
