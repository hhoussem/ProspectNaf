import { NextRequest } from 'next/server'

const GEO_API = 'https://geo.api.gouv.fr'

export interface GeoSuggestion {
  type: 'commune' | 'departement' | 'region' | 'codepostal'
  label: string
  code: string        // dept code, region code, INSEE commune code, or postal code
  deptCode?: string   // for communes: the department code
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json({ results: [] })

  const results: GeoSuggestion[] = []

  // ── Numeric input: dept code or postal code ──────────────────────────────
  if (/^\d+$/.test(q)) {
    if (q.length <= 3) {
      // Could be a department code — look it up
      try {
        const depts = await fetch(
          `${GEO_API}/departements?code=${encodeURIComponent(q)}&fields=nom,code&limit=3`,
          { cache: 'no-store' }
        ).then((r) => r.json()).catch(() => [])

        if (Array.isArray(depts) && depts.length > 0) {
          for (const d of depts) {
            results.push({ type: 'departement', label: `${d.nom} (${d.code})`, code: d.code })
          }
        } else {
          // No exact match — show as raw dept code suggestion
          results.push({
            type: 'departement',
            label: `Département ${q}`,
            code: q.padStart(2, '0'),
          })
        }
      } catch {
        results.push({ type: 'departement', label: `Département ${q}`, code: q.padStart(2, '0') })
      }
    }

    if (q.length >= 4 && q.length <= 5) {
      // Postal code — look up communes with this code
      const cp = q.padEnd(5, '0')
      try {
        const communes = await fetch(
          `${GEO_API}/communes?codePostal=${encodeURIComponent(cp)}&fields=nom,code,codeDepartement&limit=5`,
          { cache: 'no-store' }
        ).then((r) => r.json()).catch(() => [])

        if (Array.isArray(communes) && communes.length > 0) {
          for (const c of communes) {
            results.push({
              type: 'codepostal',
              label: `${cp} — ${c.nom}`,
              code: cp,
              deptCode: c.codeDepartement,
            })
          }
        } else {
          results.push({ type: 'codepostal', label: `Code postal ${cp}`, code: cp })
        }
      } catch {
        results.push({ type: 'codepostal', label: `Code postal ${cp}`, code: cp })
      }
    }

    return Response.json({ results: results.slice(0, 5) })
  }

  // ── Text input: name search ──────────────────────────────────────────────
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

    results.push(
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
    )
  } catch {
    // return empty on error
  }

  return Response.json({ results: results.slice(0, 8) })
}
