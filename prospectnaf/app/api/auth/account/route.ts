import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { apiError } from '@/lib/utils'
import { sendEmail } from '@/lib/email'
import AccountDeleted from '@/emails/AccountDeleted'
import React from 'react'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Non authentifié', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubId: true, email: true },
    })

    // Cancel Stripe subscription if active
    if (user?.stripeSubId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubId)
      } catch (err) {
        console.error('[delete-account] Stripe cancel error:', err)
        // Continue with deletion even if Stripe fails
      }
    }

    // Cascade delete: User → Lists → ListCompanies (via Prisma onDelete: Cascade)
    await prisma.user.delete({ where: { id: session.user.id } })

    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: 'Ton compte ProspectNAF a été supprimé',
        template: React.createElement(AccountDeleted, { email: user.email }),
      }).catch((err) => console.error('[delete-account] email error:', err))
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[delete-account]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
