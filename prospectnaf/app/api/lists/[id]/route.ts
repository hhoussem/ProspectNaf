import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RenameListSchema } from '@/lib/validators/list'
import { apiError } from '@/lib/utils'

type Params = { params: { id: string } }

async function getOwnedList(userId: string, listId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } })
  if (!list) return null
  if (list.userId !== userId) return null
  return list
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

  const list = await prisma.list.findUnique({
    where: { id: params.id },
    include: {
      companies: { orderBy: { addedAt: 'desc' } },
    },
  })

  if (!list || list.userId !== session.user.id) {
    return apiError('FORBIDDEN', 'Liste introuvable', 404)
  }

  return Response.json({ list })
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const list = await getOwnedList(session.user.id, params.id)
    if (!list) return apiError('FORBIDDEN', 'Liste introuvable', 404)

    const body = await req.json()
    const parsed = RenameListSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Nom invalide', 400, parsed.error.flatten())
    }

    const updated = await prisma.list.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
      include: { _count: { select: { companies: true } } },
    })

    return Response.json({
      list: {
        id: updated.id,
        name: updated.name,
        companyCount: updated._count.companies,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('[lists/:id PUT]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const list = await getOwnedList(session.user.id, params.id)
    if (!list) return apiError('FORBIDDEN', 'Liste introuvable', 404)

    await prisma.list.delete({ where: { id: params.id } })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[lists/:id DELETE]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
