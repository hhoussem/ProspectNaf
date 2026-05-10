import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UpdateAnnotationSchema } from '@/lib/validators/list'
import { apiError } from '@/lib/utils'
import { PLAN_LIMITS } from '@/lib/quota'
import type { Plan } from '@/types/plan'

type Params = { params: { id: string; siren: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const plan = session.user.plan as Plan
    if (!PLAN_LIMITS[plan].canAnnotate) {
      return apiError('FORBIDDEN', 'Les annotations nécessitent un plan payant', 403)
    }

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list || list.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Liste introuvable', 404)
    }

    const body = await req.json()
    const parsed = UpdateAnnotationSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Données invalides', 400, parsed.error.flatten())
    }

    const updated = await prisma.listCompany.update({
      where: { listId_siren: { listId: params.id, siren: params.siren } },
      data: parsed.data,
    })

    return Response.json({ company: updated })
  } catch (err) {
    console.error('[lists/:id/companies/:siren PATCH]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list || list.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Liste introuvable', 404)
    }

    await prisma.listCompany.delete({
      where: { listId_siren: { listId: params.id, siren: params.siren } },
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[lists/:id/companies/:siren DELETE]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
