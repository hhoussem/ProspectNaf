'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ForgotPasswordSchema } from '@/lib/validators/auth'
import { z } from 'zod'

type Input = z.infer<typeof ForgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(ForgotPasswordSchema),
  })

  async function onSubmit(data: Input) {
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8 text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-bold text-gray-900">Email envoyé</h1>
          <p className="text-gray-600 text-sm">
            Si un compte existe avec cette adresse, tu recevras un lien de réinitialisation dans quelques minutes.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500 mt-1">
            Saisis ton email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <Link href="/login" className="block text-sm text-center text-blue-600 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
