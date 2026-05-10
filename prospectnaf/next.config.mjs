/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com https://recherche-entreprises.api.gouv.fr",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "font-src 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  webpack(config) {
    // Allow importing JSON files from anywhere in the project
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
    }
    return config
  },
}

export default nextConfig
