import { NextRequest } from 'next/server'
import { searchNaf } from '@/lib/naf'
import { apiError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (q.length < 2) {
    return Response.json({ results: [] })
  }

  try {
    const results = await searchNaf(q)
    return Response.json({ results })
  } catch (err) {
    console.error('[naf/autocomplete]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
