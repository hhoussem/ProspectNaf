'use client'

import { useState } from 'react'
import SearchForm from './SearchForm'
import ResultsList from '@/components/results/ResultsList'
import type { Plan } from '@/types/plan'
import type { SearchInput } from '@/lib/validators/search'
import type { SearchResult } from '@/lib/sirene'

interface Props {
  plan: Plan
  searchesToday: number
}

export default function SearchClient({ plan, searchesToday }: Props) {
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastParams, setLastParams] = useState<SearchInput | null>(null)

  const planLimit = plan === 'FREE' ? 3 : null
  const nearLimit = planLimit !== null && searchesToday >= planLimit * 0.8

  async function handleSearch(params: SearchInput) {
    setLoading(true)
    setError(null)
    setLastParams(params)

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      if (res.status === 429) {
        setError("Tu as atteint la limite de ton plan gratuit. Passe au plan Solo pour continuer.")
      } else if (res.status === 503) {
        setError("Les données sont temporairement indisponibles. Réessaie dans quelques instants.")
      } else {
        setError(json.error?.message ?? "Une erreur est survenue.")
      }
      return
    }

    const data: SearchResult = await res.json()
    setResults(data)
  }

  async function handlePageChange(page: number) {
    if (!lastParams) return
    await handleSearch({ ...lastParams, page })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">ProspectNAF</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {planLimit !== null && (
            <span className={nearLimit ? 'text-orange-600 font-medium' : ''}>
              {searchesToday}/{planLimit} recherches aujourd&apos;hui
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium uppercase">
            {plan}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {nearLimit && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
            Tu as utilisé {searchesToday}/{planLimit} recherches aujourd&apos;hui.{' '}
            <a href="/account" className="underline font-medium">Passe au plan Solo</a> pour des recherches illimitées.
          </div>
        )}

        <SearchForm onSearch={handleSearch} loading={loading} plan={plan} />

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {results && (
          <ResultsList
            results={results}
            plan={plan}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  )
}
