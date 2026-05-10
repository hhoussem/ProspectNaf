import { createHash } from 'crypto'
import { redis, TTL, REDIS_AVAILABLE } from './redis'
import { prisma } from './db'
import type { Company } from '@/types/company'
import { EFFECTIF_LABELS, FORME_JURIDIQUE_LABELS } from '@/types/company'
import type { SearchInput } from './validators/search'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr'

/** Convert internal NAF format (6201Z) to API format (62.01Z) */
function toApiNafCode(code: string): string {
  // Already has a dot
  if (code.includes('.')) return code
  // 5-char format: 4 digits + 1 letter → insert dot after position 2
  if (/^\d{4}[A-Z]$/.test(code)) {
    return `${code.slice(0, 2)}.${code.slice(2)}`
  }
  return code
}

export interface SearchResult {
  total: number
  page: number
  perPage: number
  results: Company[]
  source: 'api' | 'cache' | 'local'
}

// ─── Cache key ────────────────────────────────────────────────────────────────

export function buildCacheKey(params: SearchInput): string {
  const normalized = JSON.stringify({
    naf: [...params.nafCodes].sort(),
    loc: [...(params.locations ?? [])].sort(),
    eff: [...(params.effectifs ?? [])].sort(),
    dateFrom: params.dateFrom ?? null,
    dateTo: params.dateTo ?? null,
    statut: params.statut,
    formes: [...(params.formes ?? [])].sort(),
    page: params.page,
    perPage: params.perPage,
  })
  return `search:${createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`
}

// ─── API response types ───────────────────────────────────────────────────────

interface ApiSiege {
  siret: string
  numero_voie?: string
  type_voie?: string
  libelle_voie?: string
  code_postal?: string
  libelle_commune?: string
  departement?: string
  region?: string
  code_commune?: string
}

interface ApiCompany {
  siren: string
  nom_complet: string
  siege: ApiSiege
  activite_principale: string
  libelle_activite_principale: string
  tranche_effectif_salarie?: string
  date_creation?: string
  categorie_juridique?: string
  etat_administratif: 'A' | 'F'
}

interface ApiResponse {
  total_results: number
  page: number
  per_page: number
  results: ApiCompany[]
}

// ─── Transform ────────────────────────────────────────────────────────────────

export function transformCompany(raw: ApiCompany): Company {
  const voie = [raw.siege.type_voie, raw.siege.libelle_voie].filter(Boolean).join(' ')
  return {
    siren: raw.siren,
    siretSiege: raw.siege.siret,
    denomination: raw.nom_complet,
    adresseNumero: raw.siege.numero_voie ?? null,
    adresseVoie: voie || null,
    codePostal: raw.siege.code_postal ?? null,
    ville: raw.siege.libelle_commune ?? null,
    departement: raw.siege.departement ?? null,
    region: raw.siege.region ?? null,
    codeNaf: raw.activite_principale,
    libelleNaf: raw.libelle_activite_principale,
    trancheEffectif: raw.tranche_effectif_salarie ?? null,
    libelleEffectif: EFFECTIF_LABELS[raw.tranche_effectif_salarie ?? ''] ?? 'Non renseigné',
    dateCreation: raw.date_creation ?? null,
    formeJuridique: FORME_JURIDIQUE_LABELS[raw.categorie_juridique ?? ''] ?? null,
    isActive: raw.etat_administratif === 'A',
  }
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function callGouvernementAPI(params: SearchInput): Promise<SearchResult> {
  const url = new URL(`${API_BASE}/search`)

  url.searchParams.set('activite_principale', params.nafCodes.map(toApiNafCode).join(','))
  url.searchParams.set('page', String(params.page))
  url.searchParams.set('per_page', String(Math.min(params.perPage, 25))) // API max = 25

  if (params.locations?.length) {
    // Heuristic: 2-3 digits = department code, else treat as commune/city name
    const depts = params.locations.filter((l: string) => /^\d{2,3}$/.test(l))
    const communes = params.locations.filter((l: string) => !/^\d{2,3}$/.test(l))
    if (depts.length) url.searchParams.set('departement', depts.join(','))
    if (communes.length) url.searchParams.set('commune', communes.join(','))
  }

  if (params.effectifs?.length) {
    // effectifs values may be comma-separated strings like "NN,00" or "01,02"
    const codes = params.effectifs.flatMap((e: string) => e.split(','))
    url.searchParams.set('tranche_effectif_salarie', codes.join(','))
  }

  if (params.dateFrom) {
    const d = params.dateFrom.length === 4 ? `${params.dateFrom}-01-01` : params.dateFrom
    url.searchParams.set('date_creation_min', d)
  }

  if (params.dateTo) {
    const d = params.dateTo.length === 4 ? `${params.dateTo}-12-31` : params.dateTo
    url.searchParams.set('date_creation_max', d)
  }

  if (params.statut === 'ACTIF') url.searchParams.set('etat_administratif', 'A')
  else if (params.statut === 'FERME') url.searchParams.set('etat_administratif', 'F')

  if (params.formes?.length) {
    // formes values may be comma-separated codes like "5710,5720"
    const codes = params.formes.flatMap((f: string) => f.split(','))
    url.searchParams.set('categorie_juridique', codes.join(','))
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new ApiUnavailableError(`API gouvernementale returned ${res.status}`)
  }

  const data: ApiResponse = await res.json()

  return {
    total: data.total_results,
    page: data.page,
    perPage: data.per_page,
    results: data.results.map(transformCompany),
    source: 'api',
  }
}

// ─── Local fallback ───────────────────────────────────────────────────────────

async function searchLocalSirene(params: SearchInput): Promise<SearchResult> {
  const where: Record<string, unknown> = {
    codeNaf: { in: params.nafCodes },
  }

  if (params.statut === 'ACTIF') where.isActive = true
  else if (params.statut === 'FERME') where.isActive = false

  if (params.locations?.length) {
    const depts = params.locations.filter((l: string) => /^\d{2,3}$/.test(l))
    if (depts.length) where.codeDept = { in: depts }
  }

  if (params.effectifs?.length) {
    where.trancheEffectif = { in: params.effectifs }
  }

  const skip = (params.page - 1) * params.perPage
  const [total, rows] = await Promise.all([
    prisma.sireneCompany.count({ where }),
    prisma.sireneCompany.findMany({ where, skip, take: params.perPage }),
  ])

  const results: Company[] = rows.map((r: typeof rows[number]) => ({
    siren: r.siren,
    siretSiege: r.siretSiege,
    denomination: r.denomination,
    adresseNumero: r.adresseNumero,
    adresseVoie: r.adresseVoie,
    codePostal: r.codePostal,
    ville: r.ville,
    departement: r.codeDept,
    region: r.codeRegion,
    codeNaf: r.codeNaf,
    libelleNaf: r.libelleNaf,
    trancheEffectif: r.trancheEffectif,
    libelleEffectif: EFFECTIF_LABELS[r.trancheEffectif ?? ''] ?? 'Non renseigné',
    dateCreation: r.dateCreation?.toISOString() ?? null,
    formeJuridique: r.formeJuridique,
    isActive: r.isActive,
  }))

  return { total, page: params.page, perPage: params.perPage, results, source: 'local' }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function searchCompanies(params: SearchInput): Promise<SearchResult> {
  const cacheKey = buildCacheKey(params)

  // Cache lookup
  const cached = REDIS_AVAILABLE ? await redis.get<SearchResult>(cacheKey) : null
  if (cached) return { ...cached, source: 'cache' }

  let result: SearchResult
  try {
    result = await callGouvernementAPI(params)
  } catch (err) {
    if (err instanceof ApiUnavailableError) {
      result = await searchLocalSirene(params)
    } else {
      throw err
    }
  }

  // Store in cache (only API results, not local fallback)
  if (result.source === 'api' && REDIS_AVAILABLE) {
    await redis.set(cacheKey, result, { ex: TTL.SEARCH_CACHE })
  }

  return result
}

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiUnavailableError'
  }
}
