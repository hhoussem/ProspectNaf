// NAF autocomplete — filtered in-memory from static JSON
// The full naf-codes.json is loaded once at module level

export interface NafEntry {
  code: string
  label: string
  synonyms: string[]
}

// Lazy-loaded from public/naf-codes.json at runtime
let _nafData: NafEntry[] | null = null

async function getNafData(): Promise<NafEntry[]> {
  if (_nafData) return _nafData
  // In Next.js API routes, we read from the filesystem
  const { readFileSync } = await import('fs')
  const { join } = await import('path')
  const filePath = join(process.cwd(), 'public', 'naf-codes.json')
  _nafData = JSON.parse(readFileSync(filePath, 'utf-8')) as NafEntry[]
  return _nafData
}

export async function searchNaf(query: string): Promise<NafEntry[]> {
  if (query.length < 2) return []
  const data = await getNafData()
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return data
    .filter((entry) => {
      const label = entry.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const code = entry.code.toLowerCase()
      const synonymMatch = entry.synonyms.some((s) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      )
      return label.includes(q) || code.includes(q) || synonymMatch
    })
    .slice(0, 10)
}

/** Client-side version — works with pre-loaded data array */
export function searchNafSync(query: string, data: NafEntry[]): NafEntry[] {
  if (query.length < 2) return []
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return data
    .filter((entry) => {
      const label = entry.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const code = entry.code.toLowerCase()
      const synonymMatch = entry.synonyms.some((s) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      )
      return label.includes(q) || code.includes(q) || synonymMatch
    })
    .slice(0, 10)
}
