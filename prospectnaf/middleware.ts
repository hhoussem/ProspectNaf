export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    '/search',
    '/lists/:path*',
    '/account/:path*',
    '/api/search',
    '/api/lists/:path*',
    '/api/export',
    '/api/billing/checkout',
    '/api/auth/account',
  ],
}
