// NAF autocomplete — two variants:
// - searchNafSync: client-side, works with pre-loaded data array
// - searchNaf: server-side only (API route)

export interface NafEntry {
  code: string
  label: string
  synonyms: string[]
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Client-side — works with pre-loaded data array (no fs dependency) */
export function searchNafSync(query: string, data: NafEntry[]): NafEntry[] {
  if (query.length < 2) return []
  const q = normalize(query)

  return data
    .filter((entry) => {
      const label = normalize(entry.label)
      const code = entry.code.toLowerCase()
      const synonymMatch = entry.synonyms.some((s) => normalize(s).includes(q))
      return label.includes(q) || code.includes(q) || synonymMatch
    })
    .slice(0, 10)
}

/** Server-side — used by /api/naf/autocomplete route only */
export async function searchNaf(query: string): Promise<NafEntry[]> {
  if (query.length < 2) return []
  // Import the static JSON directly — no fs needed, works in both server and edge
  const { default: data } = await import('@/public/naf-codes.json')
  return searchNafSync(query, data as NafEntry[])
}
