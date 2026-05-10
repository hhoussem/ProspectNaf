import { NextRequest } from 'next/server'

// This cron job is handled automatically by Redis TTL on quota keys.
// The keys expire after 25h, so no explicit reset is needed.
// This endpoint exists as a safety net and for monitoring.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redis TTL handles quota reset automatically.
  // Log for monitoring purposes.
  console.log('[cron] reset-search-quotas: Redis TTL handles this automatically')

  return Response.json({ ok: true, message: 'Quotas reset via Redis TTL' })
}
