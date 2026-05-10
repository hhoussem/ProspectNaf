import { redis, REDIS_AVAILABLE, TTL } from './redis'

export interface RateLimitConfig {
  limit: number
  windowSeconds: number
}

// Rate limit configs per endpoint group
export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: TTL.RATE_LIMIT_AUTH },   // 10 req / 15 min / IP
  search: { limit: 60, windowSeconds: 60 },                   // 60 req / min / user
  export: { limit: 10, windowSeconds: 60 },                   // 10 req / min / user
} as const

/**
 * Fixed-window rate limiter using Redis INCR.
 * Returns { allowed, remaining, reset }.
 * Gracefully allows all requests when Redis is unavailable.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!REDIS_AVAILABLE) {
    return { allowed: true, remaining: config.limit, reset: 0 }
  }

  const windowKey = `rl:${key}:${Math.floor(Date.now() / (config.windowSeconds * 1000))}`
  const reset = Math.ceil(Date.now() / 1000 / config.windowSeconds) * config.windowSeconds

  try {
    const current = await redis.incr(windowKey)

    // Set TTL on first request in this window
    if (current === 1) {
      await redis.expire(windowKey, config.windowSeconds + 1)
    }

    const allowed = current <= config.limit
    const remaining = Math.max(0, config.limit - current)

    return { allowed, remaining, reset }
  } catch {
    // If Redis fails, allow the request (fail open)
    return { allowed: true, remaining: config.limit, reset }
  }
}
