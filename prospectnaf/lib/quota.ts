import { redis, TTL } from './redis'
import type { Plan } from '@/types/plan'

export interface QuotaPlan {
  searchesPerDay: number | null
  resultsPerSearch: number | null
  maxLists: number | null
  maxCompaniesPerList: number | null
  canExport: boolean
  canAnnotate: boolean
  exportRowLimit: number | null
}

export const PLAN_LIMITS: Record<Plan, QuotaPlan> = {
  FREE: {
    searchesPerDay: 3,
    resultsPerSearch: 20,
    maxLists: 1,
    maxCompaniesPerList: 20,
    canExport: false,
    canAnnotate: false,
    exportRowLimit: null,
  },
  SOLO: {
    searchesPerDay: null,
    resultsPerSearch: 500,
    maxLists: 10,
    maxCompaniesPerList: 500,
    canExport: true,
    canAnnotate: true,
    exportRowLimit: 500,
  },
  PRO: {
    searchesPerDay: null,
    resultsPerSearch: null,
    maxLists: null,
    maxCompaniesPerList: null,
    canExport: true,
    canAnnotate: true,
    exportRowLimit: null,
  },
}

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  return `quota:${userId}:${date}`
}

export async function getSearchCount(userId: string): Promise<number> {
  const count = await redis.get<number>(todayKey(userId))
  return count ?? 0
}

export async function checkSearchQuota(userId: string, plan: Plan): Promise<void> {
  const limits = PLAN_LIMITS[plan]
  if (limits.searchesPerDay === null) return // unlimited

  const count = await getSearchCount(userId)
  if (count >= limits.searchesPerDay) {
    throw new QuotaError('QUOTA_EXCEEDED', 'Limite de recherches journalières atteinte.')
  }
}

export async function incrementSearchCount(userId: string): Promise<void> {
  const key = todayKey(userId)
  await redis.incr(key)
  await redis.expire(key, TTL.QUOTA)
}

export async function checkListQuota(userId: string, plan: Plan, currentListCount: number): Promise<void> {
  const limits = PLAN_LIMITS[plan]
  if (limits.maxLists === null) return

  if (currentListCount >= limits.maxLists) {
    throw new QuotaError('FORBIDDEN', `Limite de ${limits.maxLists} liste(s) atteinte pour votre plan.`)
  }
}

export async function checkCompanyQuota(
  plan: Plan,
  currentCount: number,
  toAdd: number
): Promise<void> {
  const limits = PLAN_LIMITS[plan]
  if (limits.maxCompaniesPerList === null) return

  if (currentCount + toAdd > limits.maxCompaniesPerList) {
    throw new QuotaError(
      'FORBIDDEN',
      `Limite de ${limits.maxCompaniesPerList} entreprises par liste atteinte pour votre plan.`
    )
  }
}

export class QuotaError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'QuotaError'
  }
}
