import { auth } from '@/lib/auth'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { apiError } from '@/lib/utils'
import { z } from 'zod'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!

const CheckoutSchema = z.object({
  plan: z.enum(['SOLO', 'PRO']),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const body = await req.json()
    const parsed = CheckoutSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Plan invalide', 400)

    const { plan } = parsed.data
    const priceId = PRICE_IDS[plan]

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: undefined, // will be set if stripeCustomerId exists
      customer_email: session.user.email,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/account?success=true`,
      cancel_url: `${BASE_URL}/account?canceled=true`,
      subscription_data: {
        trial_period_days: plan === 'SOLO' ? 14 : undefined,
        metadata: { userId: session.user.id },
      },
    })

    return Response.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[billing/checkout]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
