'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import type { Plan } from '@/types/plan'

const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Gratuit',
  SOLO: 'Solo',
  PRO: 'Pro',
}

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  FREE: '3 recherches/jour · 1 liste · 20 entreprises · Pas d\'export',
  SOLO: 'Recherches illimitées · 10 listes · 500 entreprises · Export CSV',
  PRO: 'Tout illimité · Export CSV illimité · Annotations avancées',
}

interface Props {
  user: {
    id: string
    email: string
    plan: Plan
    searchesToday: number
  }
}

export default function AccountClient({ user }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [upgrading, setUpgrading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleUpgrade(plan: 'SOLO' | 'PRO') {
    setUpgrading(plan)
    setError(null)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setUpgrading(null)
    if (!res.ok) {
      setError('Impossible de créer la session de paiement.')
      return
    }
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setError(null)
    const res = await fetch('/api/auth/account', { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      setError('Impossible de supprimer le compte. Réessaie plus tard.')
      return
    }
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Plan actuel */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Plan actuel</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {PLAN_LABELS[user.plan]}
              </span>
              <p className="text-sm text-gray-500 mt-1">{PLAN_DESCRIPTIONS[user.plan]}</p>
            </div>
          </div>

          {user.plan === 'FREE' && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Passer à un plan payant</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">Solo — 29€/mois</p>
                  <p className="text-xs text-gray-500">Essai gratuit 14 jours</p>
                  <button
                    onClick={() => handleUpgrade('SOLO')}
                    disabled={upgrading !== null}
                    className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {upgrading === 'SOLO' ? 'Redirection...' : 'Choisir Solo'}
                  </button>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">Pro — 79€/mois</p>
                  <p className="text-xs text-gray-500">Tout illimité</p>
                  <button
                    onClick={() => handleUpgrade('PRO')}
                    disabled={upgrading !== null}
                    className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {upgrading === 'PRO' ? 'Redirection...' : 'Choisir Pro'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {user.plan !== 'FREE' && (
            <div className="border-t pt-4">
              <a
                href="/api/billing/portal"
                className="text-sm text-blue-600 hover:underline"
              >
                Gérer mon abonnement (portail Stripe) →
              </a>
            </div>
          )}
        </section>

        {/* Informations du compte */}
        <section className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Informations</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="text-gray-400">Email :</span> {user.email}</p>
            <p><span className="text-gray-400">Recherches aujourd&apos;hui :</span> {user.searchesToday}</p>
          </div>
        </section>

        {/* Suppression de compte */}
        <section className="bg-white rounded-xl border border-red-100 p-6 space-y-3">
          <h2 className="font-semibold text-red-700">Zone dangereuse</h2>
          <p className="text-sm text-gray-600">
            La suppression de compte est irréversible. Toutes tes listes et données seront effacées.
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700">
                Es-tu sûr ? Cette action est définitive.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Suppression...' : 'Oui, supprimer'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
  )
}
