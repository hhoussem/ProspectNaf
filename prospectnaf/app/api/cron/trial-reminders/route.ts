import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find users whose trial ends in 3 days or 1 day
  const in3Days = addDays(now, 3)
  const in1Day = addDays(now, 1)

  const usersExpiring3 = await prisma.user.findMany({
    where: {
      plan: 'SOLO',
      trialEndsAt: {
        gte: startOfDay(in3Days),
        lte: endOfDay(in3Days),
      },
    },
    select: { id: true, email: true, trialEndsAt: true },
  })

  const usersExpiring1 = await prisma.user.findMany({
    where: {
      plan: 'SOLO',
      trialEndsAt: {
        gte: startOfDay(in1Day),
        lte: endOfDay(in1Day),
      },
    },
    select: { id: true, email: true, trialEndsAt: true },
  })

  // TODO: send reminder emails via Resend (task 13)
  console.log(`[cron] trial-reminders: ${usersExpiring3.length} users expiring in 3 days, ${usersExpiring1.length} in 1 day`)

  return Response.json({
    ok: true,
    reminders3Days: usersExpiring3.length,
    reminders1Day: usersExpiring1.length,
  })
}
