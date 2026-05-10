import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL ?? ''
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

// Redis is considered available only when real credentials are provided
export const REDIS_AVAILABLE =
  url.startsWith('https://') &&
  !url.includes('fake') &&
  token.length > 10

export const redis = REDIS_AVAILABLE
  ? new Redis({ url, token })
  : null as unknown as Redis

// TTL constants (seconds)
export const TTL = {
  SEARCH_CACHE: 60 * 60 * 24,       // 24h
  COMPANY_CACHE: 60 * 60 * 24 * 7,  // 7 days
  QUOTA: 60 * 60 * 25,              // 25h (covers midnight reset)
  RESET_TOKEN: 60 * 60,             // 1h
  RATE_LIMIT_AUTH: 60 * 15,         // 15 min
} as const
