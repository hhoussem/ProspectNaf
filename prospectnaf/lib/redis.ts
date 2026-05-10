import { Redis } from '@upstash/redis'

// Lazy singleton — avoids crash at module load when env vars are placeholders
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// TTL constants (seconds)
export const TTL = {
  SEARCH_CACHE: 60 * 60 * 24,       // 24h
  COMPANY_CACHE: 60 * 60 * 24 * 7,  // 7 days
  QUOTA: 60 * 60 * 25,              // 25h (covers midnight reset)
  RESET_TOKEN: 60 * 60,             // 1h
  RATE_LIMIT_AUTH: 60 * 15,         // 15 min
} as const
