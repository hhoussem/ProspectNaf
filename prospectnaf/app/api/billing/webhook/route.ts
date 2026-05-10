import { NextRequest } from 'next/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.customer || !session.subscription) break

        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = sub.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId) ?? 'FREE'

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId) ?? 'FREE'

        await prisma.user.updateMany({
          where: { stripeSubId: sub.id },
          data: { plan },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.user.updateMany({
          where: { stripeSubId: sub.id },
          data: { plan: 'FREE', stripeSubId: null },
        })
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    return Response.json({ error: 'Handler error' }, { status: 500 })
  }

  return Response.json({ received: true })
}
