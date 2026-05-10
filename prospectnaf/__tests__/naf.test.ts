import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { searchNafSync, type NafEntry } from '../lib/naf'

const SAMPLE_DATA: NafEntry[] = [
  { code: '6201Z', label: 'Programmation informatique', synonyms: ['développement', 'agence web', 'logiciel'] },
  { code: '7311Z', label: 'Activités des agences de publicité', synonyms: ['agence pub', 'publicité', 'agence web'] },
  { code: '5610A', label: 'Restauration traditionnelle', synonyms: ['restaurant', 'brasserie'] },
  { code: '6202A', label: 'Conseil en systèmes et logiciels informatiques', synonyms: ['conseil informatique', 'ESN'] },
  { code: '8559A', label: 'Formation continue d\'adultes', synonyms: ['formation professionnelle'] },
  { code: '6311Z', label: 'Traitement de données, hébergement', synonyms: ['cloud', 'hosting', 'hébergement'] },
  { code: '7022Z', label: 'Conseil pour les affaires', synonyms: ['consulting', 'management'] },
  { code: '6920Z', label: 'Activités comptables', synonyms: ['comptable', 'expert-comptable'] },
  { code: '7410Z', label: 'Activités spécialisées de design', synonyms: ['design', 'graphiste', 'UX'] },
  { code: '4321A', label: 'Travaux d\'installation électrique', synonyms: ['électricien'] },
  { code: '4322A', label: 'Travaux d\'installation d\'eau et de gaz', synonyms: ['plombier'] },
]

// Feature: prospect-naf, Property 7: NAF autocomplete result count
describe('Property 7 — NAF autocomplete result count', () => {
  it('returns at most 10 results for any query of 2+ characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }),
        (query) => {
          const results = searchNafSync(query, SAMPLE_DATA)
          return results.length >= 0 && results.length <= 10
        }
      ),
      { numRuns: 200 }
    )
  })

  it('returns empty array for queries shorter than 2 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        (query) => {
          const results = searchNafSync(query, SAMPLE_DATA)
          return results.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('finds results by synonym — "agence web" matches 6201Z and 7311Z', () => {
    const results = searchNafSync('agence web', SAMPLE_DATA)
    const codes = results.map((r) => r.code)
    expect(codes).toContain('6201Z')
    expect(codes).toContain('7311Z')
  })

  it('finds results by label — "restaurant" matches 5610A', () => {
    const results = searchNafSync('restaurant', SAMPLE_DATA)
    expect(results.some((r) => r.code === '5610A')).toBe(true)
  })

  it('finds results by code — "6201" matches 6201Z', () => {
    const results = searchNafSync('6201', SAMPLE_DATA)
    expect(results.some((r) => r.code === '6201Z')).toBe(true)
  })

  it('is case-insensitive', () => {
    const lower = searchNafSync('programmation', SAMPLE_DATA)
    const upper = searchNafSync('PROGRAMMATION', SAMPLE_DATA)
    expect(lower.map((r) => r.code)).toEqual(upper.map((r) => r.code))
  })
})
