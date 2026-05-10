import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { passwordSchema, RegisterSchema } from '../lib/validators/auth'
import { SearchSchema } from '../lib/validators/search'

// Feature: prospect-naf, Property 1: Password validation rejects non-compliant passwords
describe('Property 1 — Password validation rejects non-compliant passwords', () => {
  it('rejects passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7 }),
        (pwd) => {
          const result = passwordSchema.safeParse(pwd)
          return !result.success
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects passwords without an uppercase letter', () => {
    fc.assert(
      fc.property(
        // 8+ chars, all lowercase + digits, no uppercase
        fc.stringMatching(/^[a-z0-9]{8,20}$/).filter((s) => /[0-9]/.test(s)),
        (pwd) => {
          const result = passwordSchema.safeParse(pwd)
          return !result.success
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects passwords without a digit', () => {
    fc.assert(
      fc.property(
        // 8+ chars, letters only (at least one uppercase), no digit
        fc.stringMatching(/^[a-zA-Z]{8,20}$/).filter((s) => /[A-Z]/.test(s)),
        (pwd) => {
          const result = passwordSchema.safeParse(pwd)
          return !result.success
        }
      ),
      { numRuns: 100 }
    )
  })

  it('accepts valid passwords (8+ chars, 1 uppercase, 1 digit)', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z]{5,8}$/),  // at least 5 lowercase to ensure total >= 8
          fc.stringMatching(/^[A-Z]{1,2}$/),
          fc.stringMatching(/^[0-9]{1,2}$/),
        ).map(([lower, upper, digits]) => lower + upper + digits),
        (pwd) => {
          // pwd is at least 7 chars (5+1+1), but we need 8+
          // Filter to ensure length >= 8
          if (pwd.length < 8) return true // skip, not a valid test case
          const result = passwordSchema.safeParse(pwd)
          return result.success
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: prospect-naf, Property 3: Search requires at least one NAF code
describe('Property 3 — Search requires at least one NAF code', () => {
  it('rejects search with empty nafCodes array', () => {
    const result = SearchSchema.safeParse({ nafCodes: [], page: 1, perPage: 25 })
    expect(result.success).toBe(false)
  })

  it('rejects search with no nafCodes field', () => {
    const result = SearchSchema.safeParse({ page: 1, perPage: 25 })
    expect(result.success).toBe(false)
  })

  it('accepts search with valid NAF codes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.stringMatching(/^\d{4}$/),
            fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'Z')
          ).map(([digits, letter]) => digits + letter),
          { minLength: 1, maxLength: 5 }
        ),
        (nafCodes) => {
          const result = SearchSchema.safeParse({ nafCodes, page: 1, perPage: 25 })
          return result.success
        }
      ),
      { numRuns: 100 }
    )
  })
})
