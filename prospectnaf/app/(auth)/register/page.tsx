'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterSchema, type RegisterInput } from '@/lib/validators/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error?.message ?? 'Une erreur est survenue.')
      return
    }
    router.push('/login?registered=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-sm text-gray-500 mt-1">Gratuit, sans carte bancaire</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="password-hint password-error"
            />
            <p id="password-hint" className="text-xs text-gray-400 mt-1">
              8 caractères minimum, 1 majuscule, 1 chiffre
            </p>
            {errors.password && (
              <p id="password-error" className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
