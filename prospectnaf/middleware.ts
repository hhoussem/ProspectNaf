import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/ratelimit'

// Routes that require authentication
const PROTECTED_PAGES = ['/search', '/lists', '/account', '/companies']
const PROTECTED_API = ['/api/search', '/api/lists', '/api/export', '/api/billing/checkout', '/api/auth/account', '/api/companies']

// Rate limit groups per path prefix
function getRateLimitGroup(pathname: string): keyof typeof RATE_LIMITS | null {
  if (pathname.startsWith('/api/auth/')) return 'auth'
  if (pathname.startsWith('/api/search')) return 'search'
  if (pathname.startsWith('/api/export')) return 'export'
  return null
}

function getIdentifier(req: NextRequest, userId?: string): string {
  // Prefer userId for authenticated endpoints, fall back to IP
  if (userId) return userId
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Auth check ──────────────────────────────────────────────────────────────
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p))
  const isProtectedApi = PROTECTED_API.some((p) => pathname.startsWith(p))

  let session: Awaited<ReturnType<typeof auth>> = null

  if (isProtectedPage || isProtectedApi) {
    session = await auth()

    if (!session?.user?.id) {
      if (isProtectedApi) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
          { status: 401 }
        )
      }
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const group = getRateLimitGroup(pathname)
  if (group) {
    const identifier = getIdentifier(req, session?.user?.id)
    const config = RATE_LIMITS[group]
    const { allowed, remaining, reset } = await checkRateLimit(
      `${group}:${identifier}`,
      config
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessaie dans quelques instants.' } },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(config.windowSeconds),
          },
        }
      )
    }

    const res = NextResponse.next()
    res.headers.set('X-RateLimit-Limit', String(config.limit))
    res.headers.set('X-RateLimit-Remaining', String(remaining))
    res.headers.set('X-RateLimit-Reset', String(reset))
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/search/:path*',
    '/lists/:path*',
    '/account/:path*',
    '/companies/:path*',
    '/api/search',
    '/api/lists/:path*',
    '/api/export',
    '/api/billing/checkout',
    '/api/auth/account',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/companies/:path*',
  ],
}
