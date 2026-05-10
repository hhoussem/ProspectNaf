import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { RegisterSchema } from '@/lib/validators/auth'
import { apiError } from '@/lib/utils'

const BCRYPT_ROUNDS = 12

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Données invalides', 400, parsed.error.flatten())
    }

    const { email, password, firstName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return apiError('VALIDATION_ERROR', 'Cet email est déjà utilisé', 400)
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName },
      select: { id: true, email: true, plan: true },
    })

    // TODO: send confirmation email via Resend (task 13)

    return Response.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
