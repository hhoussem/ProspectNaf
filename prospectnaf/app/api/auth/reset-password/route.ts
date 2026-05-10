import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { ResetPasswordSchema } from '@/lib/validators/auth'
import { apiError } from '@/lib/utils'

const BCRYPT_ROUNDS = 12

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ResetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Données invalides', 400, parsed.error.flatten())
    }

    const { token, password } = parsed.data
    const userId = await redis.get<string>(`reset:${token}`)

    if (!userId) {
      return apiError('VALIDATION_ERROR', 'Lien invalide ou expiré. Demande un nouveau lien.', 400)
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    await redis.del(`reset:${token}`)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
