import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { PLAN_LIMITS, checkCompanyQuota, QuotaError } from '../lib/quota'

// Mock Redis for unit tests
vi.mock('../lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
  TTL: { QUOTA: 90000 },
}))

// Feature: prospect-naf, Property 6: FREE plan quota enforcement
describe('Property 6 — FREE plan quota enforcement', () => {
  it('FREE plan resultsPerSearch is exactly 20', () => {
    expect(PLAN_LIMITS.FREE.resultsPerSearch).toBe(20)
  })

  it('FREE plan searchesPerDay is exactly 3', () => {
    expect(PLAN_LIMITS.FREE.searchesPerDay).toBe(3)
  })

  it('SOLO plan has no daily search limit', () => {
    expect(PLAN_LIMITS.SOLO.searchesPerDay).toBeNull()
  })

  it('PRO plan has no daily search limit', () => {
    expect(PLAN_LIMITS.PRO.searchesPerDay).toBeNull()
  })
})

// Feature: prospect-naf, Property 9: Plan quota limits are enforced for lists
describe('Property 9 — Company quota limits are enforced', () => {
  it('FREE plan rejects adding companies when list is full', async () => {
    // FREE plan max = 20 companies
    await expect(checkCompanyQuota('FREE', 20, 1)).rejects.toThrow(QuotaError)
  })

  it('FREE plan allows adding companies when under limit', async () => {
    await expect(checkCompanyQuota('FREE', 0, 1)).resolves.toBeUndefined()
    await expect(checkCompanyQuota('FREE', 19, 1)).resolves.toBeUndefined()
  })

  it('SOLO plan rejects adding companies when list is full', async () => {
    await expect(checkCompanyQuota('SOLO', 500, 1)).rejects.toThrow(QuotaError)
  })

  it('PRO plan has no company limit', async () => {
    await expect(checkCompanyQuota('PRO', 10000, 1000)).resolves.toBeUndefined()
  })

  it('for any plan, adding 0 companies never throws', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('FREE' as const, 'SOLO' as const, 'PRO' as const),
        // currentCount must be within the plan limit to make the test meaningful
        fc.nat(19), // max 19 so FREE (limit=20) is never exceeded
        async (plan, currentCount) => {
          await expect(checkCompanyQuota(plan, currentCount, 0)).resolves.toBeUndefined()
          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
