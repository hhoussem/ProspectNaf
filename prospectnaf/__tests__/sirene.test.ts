import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

// Mock Redis before importing sirene (sirene imports redis at module level)
vi.mock('../lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
  TTL: { SEARCH_CACHE: 86400 },
}))

import { buildCacheKey, transformCompany } from '../lib/sirene'
import type { SearchInput } from '../lib/validators/search'

// Feature: prospect-naf, Property 4: NAF OR logic — cache key normalization
describe('buildCacheKey — deterministic and order-independent', () => {
  it('produces the same key regardless of NAF code order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.stringMatching(/^\d{4}$/),
            fc.constantFrom('A', 'B', 'Z')
          ).map(([d, l]) => d + l),
          { minLength: 2, maxLength: 5 }
        ),
        (nafCodes) => {
          const shuffled = [...nafCodes].reverse()
          const params1: SearchInput = { nafCodes, page: 1, perPage: 25, statut: 'ACTIF' }
          const params2: SearchInput = { nafCodes: shuffled, page: 1, perPage: 25, statut: 'ACTIF' }
          return buildCacheKey(params1) === buildCacheKey(params2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('produces different keys for different NAF codes', () => {
    const params1: SearchInput = { nafCodes: ['6201Z'], page: 1, perPage: 25, statut: 'ACTIF' }
    const params2: SearchInput = { nafCodes: ['7311Z'], page: 1, perPage: 25, statut: 'ACTIF' }
    expect(buildCacheKey(params1)).not.toBe(buildCacheKey(params2))
  })

  it('produces different keys for different pages', () => {
    const params1: SearchInput = { nafCodes: ['6201Z'], page: 1, perPage: 25, statut: 'ACTIF' }
    const params2: SearchInput = { nafCodes: ['6201Z'], page: 2, perPage: 25, statut: 'ACTIF' }
    expect(buildCacheKey(params1)).not.toBe(buildCacheKey(params2))
  })
})

describe('transformCompany', () => {
  it('maps etat_administratif A to isActive=true', () => {
    const raw = {
      siren: '123456789',
      nom_complet: 'Test SAS',
      siege: {
        siret: '12345678900001',
        libelle_commune: 'Paris',
        departement: '75',
      },
      activite_principale: '6201Z',
      libelle_activite_principale: 'Programmation informatique',
      etat_administratif: 'A' as const,
    }
    const company = transformCompany(raw)
    expect(company.isActive).toBe(true)
    expect(company.siren).toBe('123456789')
    expect(company.codeNaf).toBe('6201Z')
  })

  it('maps etat_administratif F to isActive=false', () => {
    const raw = {
      siren: '987654321',
      nom_complet: 'Closed SARL',
      siege: { siret: '98765432100001' },
      activite_principale: '5610A',
      libelle_activite_principale: 'Restauration traditionnelle',
      etat_administratif: 'F' as const,
    }
    const company = transformCompany(raw)
    expect(company.isActive).toBe(false)
  })

  it('handles missing optional fields gracefully', () => {
    const raw = {
      siren: '111111111',
      nom_complet: 'Minimal SAS',
      siege: { siret: '11111111100001' },
      activite_principale: '6201Z',
      libelle_activite_principale: 'Programmation informatique',
      etat_administratif: 'A' as const,
    }
    const company = transformCompany(raw)
    expect(company.ville).toBeNull()
    expect(company.departement).toBeNull()
    expect(company.trancheEffectif).toBeNull()
    expect(company.libelleEffectif).toBe('Non renseigné')
  })
})
