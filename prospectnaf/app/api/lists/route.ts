import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkListQuota, QuotaError } from '@/lib/quota'
import { CreateListSchema } from '@/lib/validators/list'
import { apiError } from '@/lib/utils'
import type { Plan } from '@/types/plan'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { companies: true } } },
  })

  return Response.json({
    lists: lists.map((l: typeof lists[number]) => ({
      id: l.id,
      name: l.name,
      companyCount: l._count.companies,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const body = await req.json()
    const parsed = CreateListSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Données invalides', 400, parsed.error.flatten())
    }

    const plan = session.user.plan as Plan
    const currentCount = await prisma.list.count({ where: { userId: session.user.id } })
    await checkListQuota(session.user.id, plan, currentCount)

    const list = await prisma.list.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        companies: parsed.data.sirens?.length
          ? {
              createMany: {
                data: parsed.data.sirens.map((siren: string) => ({ siren })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: { _count: { select: { companies: true } } },
    })

    return Response.json(
      {
        list: {
          id: list.id,
          name: list.name,
          companyCount: list._count.companies,
          createdAt: list.createdAt.toISOString(),
          updatedAt: list.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof QuotaError) return apiError(err.code, err.message, 403)
    console.error('[lists POST]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
