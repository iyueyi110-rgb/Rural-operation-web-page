export interface AdminLoginFailureBucket {
  count: number
  resetAt: number
  touchedAt: number
}

export interface AdminLoginFailureStore {
  getClient(clientId: string, now: number): AdminLoginFailureBucket | undefined
  getGlobal(now: number): AdminLoginFailureBucket | undefined
  incrementClient(
    clientId: string,
    now: number,
    windowMs: number,
  ): AdminLoginFailureBucket
  incrementGlobal(now: number, windowMs: number): AdminLoginFailureBucket
  decrementGlobal(now: number): void
  clearClient(clientId: string): void
}

function activeBucket(
  bucket: AdminLoginFailureBucket | undefined,
  now: number,
) {
  return bucket && bucket.resetAt > now ? bucket : undefined
}

/**
 * Process-local fallback for one Admin instance. Multi-instance deployments
 * must inject a shared store to make the global bucket fleet-wide.
 */
export class BoundedAdminLoginFailureStore implements AdminLoginFailureStore {
  private readonly clients = new Map<string, AdminLoginFailureBucket>()
  private global: AdminLoginFailureBucket | undefined

  constructor(private readonly maxClients = 1_024) {
    if (!Number.isSafeInteger(maxClients) || maxClients < 1) {
      throw new Error("maxClients must be a positive safe integer")
    }
  }

  get clientSize() {
    return this.clients.size
  }

  private pruneExpiredClients(now: number) {
    for (const [clientId, bucket] of this.clients) {
      if (bucket.resetAt <= now) this.clients.delete(clientId)
    }
  }

  private evictOldestClient() {
    let oldestId: string | undefined
    let oldestTouchedAt = Number.POSITIVE_INFINITY
    for (const [clientId, bucket] of this.clients) {
      if (bucket.touchedAt < oldestTouchedAt) {
        oldestId = clientId
        oldestTouchedAt = bucket.touchedAt
      }
    }
    if (oldestId) this.clients.delete(oldestId)
  }

  getClient(clientId: string, now: number) {
    const bucket = activeBucket(this.clients.get(clientId), now)
    if (!bucket) this.clients.delete(clientId)
    return bucket ? { ...bucket } : undefined
  }

  getGlobal(now: number) {
    const bucket = activeBucket(this.global, now)
    if (!bucket) this.global = undefined
    return bucket ? { ...bucket } : undefined
  }

  incrementClient(clientId: string, now: number, windowMs: number) {
    const current = activeBucket(this.clients.get(clientId), now)
    if (!current) {
      this.pruneExpiredClients(now)
      if (this.clients.size >= this.maxClients) this.evictOldestClient()
    }
    const next = current
      ? { ...current, count: current.count + 1, touchedAt: now }
      : { count: 1, resetAt: now + windowMs, touchedAt: now }
    this.clients.set(clientId, next)
    return { ...next }
  }

  incrementGlobal(now: number, windowMs: number) {
    const current = activeBucket(this.global, now)
    this.global = current
      ? { ...current, count: current.count + 1, touchedAt: now }
      : { count: 1, resetAt: now + windowMs, touchedAt: now }
    return { ...this.global }
  }

  decrementGlobal(now: number) {
    const current = activeBucket(this.global, now)
    if (!current || current.count <= 1) {
      this.global = undefined
      return
    }
    this.global = { ...current, count: current.count - 1, touchedAt: now }
  }

  clearClient(clientId: string) {
    this.clients.delete(clientId)
  }

  clientFailureCount(clientId: string, now: number) {
    return this.getClient(clientId, now)?.count ?? 0
  }

  globalFailureCount(now: number) {
    return this.getGlobal(now)?.count ?? 0
  }

  hasClient(clientId: string, now: number) {
    return Boolean(this.getClient(clientId, now))
  }
}

export interface AdminLoginRateLimitOptions {
  clientLimit: number
  clientWindowMs: number
  globalLimit: number
  globalWindowMs: number
}

export interface AdminLoginRateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
}

const defaultOptions: AdminLoginRateLimitOptions = {
  clientLimit: 5,
  clientWindowMs: 15 * 60 * 1_000,
  globalLimit: 20,
  globalWindowMs: 60 * 1_000,
}

export class AdminLoginRateLimiter {
  private readonly options: AdminLoginRateLimitOptions

  constructor(
    private readonly store: AdminLoginFailureStore,
    options: Partial<AdminLoginRateLimitOptions> = {},
  ) {
    this.options = { ...defaultOptions, ...options }
  }

  check(clientId: string, now: number): AdminLoginRateLimitDecision {
    const client = this.store.getClient(clientId, now)
    const global = this.store.getGlobal(now)
    const resetTimes = [
      ...(client && client.count >= this.options.clientLimit
        ? [client.resetAt]
        : []),
      ...(global && global.count >= this.options.globalLimit
        ? [global.resetAt]
        : []),
    ]
    if (resetTimes.length === 0) {
      return { allowed: true, retryAfterSeconds: 0 }
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((Math.max(...resetTimes) - now) / 1_000),
      ),
    }
  }

  reserveAttempt(clientId: string, now: number) {
    const decision = this.check(clientId, now)
    if (decision.allowed) this.recordFailure(clientId, now)
    return decision
  }

  recordFailure(clientId: string, now: number) {
    this.store.incrementClient(clientId, now, this.options.clientWindowMs)
    this.store.incrementGlobal(now, this.options.globalWindowMs)
  }

  recordSuccess(clientId: string, now: number) {
    this.store.clearClient(clientId)
    this.store.decrementGlobal(now)
  }
}

const globalForAdminLogin = globalThis as typeof globalThis & {
  __zoumaAdminLoginLimiter?: AdminLoginRateLimiter
}

export const defaultAdminLoginRateLimiter =
  globalForAdminLogin.__zoumaAdminLoginLimiter ??
  new AdminLoginRateLimiter(new BoundedAdminLoginFailureStore())

if (process.env.NODE_ENV !== "production") {
  globalForAdminLogin.__zoumaAdminLoginLimiter = defaultAdminLoginRateLimiter
}

export function trustedAdminClientIdentifier(request: Request) {
  if (process.env.VERCEL === "1") {
    const address = request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim()
    if (address && address.length <= 64 && /^[0-9a-f:.]+$/iu.test(address)) {
      return `vercel:${address.toLowerCase()}`
    }
  }
  // Never trust ordinary X-Forwarded-For from an anonymous request.
  return "unattributed"
}
