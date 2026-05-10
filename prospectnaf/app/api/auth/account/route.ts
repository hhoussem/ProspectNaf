import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { apiError } from '@/lib/utils'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Non authentifié', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubId: true },
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

    // TODO: send account deleted confirmation email (task 13)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[delete-account]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
