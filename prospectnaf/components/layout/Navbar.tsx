'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Plan } from '@/types/plan'

const PLAN_BADGE: Record<Plan, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  SOLO: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
}

interface Props {
  plan: Plan
}

export default function Navbar({ plan }: Props) {
  const pathname = usePathname()

  const links = [
    { href: '/search', label: 'Recherche' },
    { href: '/lists', label: 'Mes listes' },
    { href: '/account', label: 'Compte' },
  ]

  const planLimit = plan === 'FREE' ? 3 : null

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/search" className="font-bold text-gray-900 text-base shrink-0">
          ProspectNAF
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_BADGE[plan]}`}>
            {plan}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
