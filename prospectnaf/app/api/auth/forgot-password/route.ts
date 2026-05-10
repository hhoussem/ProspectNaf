import { NextRequest } from 'next/server'
import { createId } from '@paralleldrive/cuid2'
import { prisma } from '@/lib/db'
import { redis, TTL } from '@/lib/redis'
import { ForgotPasswordSchema } from '@/lib/validators/auth'
import { apiError } from '@/lib/utils'
import { sendEmail } from '@/lib/email'
import ResetPassword from '@/emails/ResetPassword'
import React from 'react'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ForgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Email invalide', 400)
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return 200 to avoid email enumeration
    if (!user) {
      return Response.json({ ok: true })
    }

    const token = createId()
    await redis.set(`reset:${token}`, user.id, { ex: TTL.RESET_TOKEN })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    await sendEmail({
      to: email,
      subject: 'Réinitialisation de ton mot de passe ProspectNAF',
      template: React.createElement(ResetPassword, { resetUrl }),
    }).catch((err) => console.error('[forgot-password] email error:', err))

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
