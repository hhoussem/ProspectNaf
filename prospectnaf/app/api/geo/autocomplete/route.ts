import { NextRequest } from 'next/server'

const GEO_API = 'https://geo.api.gouv.fr'

export interface GeoSuggestion {
  type: 'commune' | 'departement' | 'region'
  label: string
  code: string        // INSEE code (commune) or dept code or region code
  deptCode?: string   // for communes: the department code
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return Response.json({ results: [] })

  const fields = 'nom,code,codeDepartement'
  const limit = 5

  try {
    const [communes, depts, regions] = await Promise.all([
      fetch(`${GEO_API}/communes?nom=${encodeURIComponent(q)}&fields=${fields}&boost=population&limit=${limit}`, { cache: 'no-store' })
        .then((r) => r.json()).catch(() => []),
      fetch(`${GEO_API}/departements?nom=${encodeURIComponent(q)}&fields=nom,code&limit=3`, { cache: 'no-store' })
        .then((r) => r.json()).catch(() => []),
      fetch(`${GEO_API}/regions?nom=${encodeURIComponent(q)}&fields=nom,code&limit=2`, { cache: 'no-store' })
        .then((r) => r.json()).catch(() => []),
    ])

    const results: GeoSuggestion[] = [
      ...Array.isArray(depts) ? depts.map((d: { nom: string; code: string }) => ({
        type: 'departement' as const,
        label: `${d.nom} (${d.code})`,
        code: d.code,
      })) : [],
      ...Array.isArray(regions) ? regions.map((r: { nom: string; code: string }) => ({
        type: 'region' as const,
        label: r.nom,
        code: r.code,
      })) : [],
      ...Array.isArray(communes) ? communes.map((c: { nom: string; code: string; codeDepartement?: string }) => ({
        type: 'commune' as const,
        label: `${c.nom} (${c.codeDepartement ?? ''})`,
        code: c.code,
        deptCode: c.codeDepartement,
      })) : [],
    ]

    return Response.json({ results: results.slice(0, 8) })
  } catch {
    return Response.json({ results: [] })
  }
}
