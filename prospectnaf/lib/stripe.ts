import Stripe from 'stripe'
import type { Plan } from '@/types/plan'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PRICE_IDS: Record<Exclude<Plan, 'FREE'>, string> = {
  SOLO: process.env.STRIPE_SOLO_PRICE_ID!,
  PRO: process.env.STRIPE_PRO_PRICE_ID!,
}

export function getPlanFromPriceId(priceId: string): Plan | null {
  for (const [plan, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) return plan as Plan
  }
  return null
}
