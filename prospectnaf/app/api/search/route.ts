import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { searchCompanies } from '@/lib/sirene'
import { checkSearchQuota, incrementSearchCount, PLAN_LIMITS, QuotaError } from '@/lib/quota'
import { SearchSchema } from '@/lib/validators/search'
import { apiError } from '@/lib/utils'
import type { Plan } from '@/types/plan'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Non authentifié', 401)
    }

    const body = await req.json()
    const parsed = SearchSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Paramètres invalides', 400, parsed.error.flatten())
    }

    const plan = session.user.plan as Plan

    // Check daily quota
    await checkSearchQuota(session.user.id, plan)

    const params = parsed.data
    const result = await searchCompanies(params)

    // Increment counter after successful search
    await incrementSearchCount(session.user.id)

    // Apply plan result limit
    const limits = PLAN_LIMITS[plan]
    if (limits.resultsPerSearch !== null && result.results.length > limits.resultsPerSearch) {
      result.results = result.results.slice(0, limits.resultsPerSearch)
      result.total = Math.min(result.total, limits.resultsPerSearch)
    }

    return Response.json(result)
  } catch (err) {
    if (err instanceof QuotaError) {
      const status = err.code === 'QUOTA_EXCEEDED' ? 429 : 403
      return apiError(err.code, err.message, status)
    }
    console.error('[search]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
