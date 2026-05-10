import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkCompanyQuota, QuotaError } from '@/lib/quota'
import { AddCompaniesSchema, UpdateAnnotationSchema } from '@/lib/validators/list'
import { apiError } from '@/lib/utils'
import type { Plan } from '@/types/plan'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const list = await prisma.list.findUnique({
      where: { id: params.id },
      include: { _count: { select: { companies: true } } },
    })
    if (!list || list.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Liste introuvable', 404)
    }

    const body = await req.json()
    const parsed = AddCompaniesSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Données invalides', 400, parsed.error.flatten())
    }

    const plan = session.user.plan as Plan
    const { sirens } = parsed.data
    const currentCount = list._count.companies

    // Check quota (will throw if exceeded)
    await checkCompanyQuota(plan, currentCount, sirens.length)

    // Find already present SIRENs
    const existing = await prisma.listCompany.findMany({
      where: { listId: params.id, siren: { in: sirens } },
      select: { siren: true },
    })
    const existingSet = new Set(existing.map((e) => e.siren))
    const toAdd = sirens.filter((s) => !existingSet.has(s))

    if (toAdd.length > 0) {
      await prisma.listCompany.createMany({
        data: toAdd.map((siren) => ({ listId: params.id, siren })),
        skipDuplicates: true,
      })
      await prisma.list.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
    }

    return Response.json({
      added: toAdd.length,
      alreadyPresent: existingSet.size,
      limitReached: false,
    })
  } catch (err) {
    if (err instanceof QuotaError) {
      return Response.json(
        { added: 0, alreadyPresent: 0, limitReached: true, error: err.message },
        { status: 403 }
      )
    }
    console.error('[lists/:id/companies POST]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
