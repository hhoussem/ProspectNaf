'use client'

import { useState } from 'react'
import SearchForm from './SearchForm'
import ResultsList from '@/components/results/ResultsList'
import SaveToListModal from '@/components/lists/SaveToListModal'
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSaveModal, setShowSaveModal] = useState(false)

  const planLimit = plan === 'FREE' ? 3 : null
  const nearLimit = planLimit !== null && searchesToday >= planLimit * 0.8

  async function handleSearch(params: SearchInput) {
    setLoading(true)
    setError(null)
    setLastParams(params)
    setSelected(new Set())

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      if (res.status === 429) {
        setError('Tu as atteint la limite de ton plan gratuit. Passe au plan Solo pour continuer.')
      } else if (res.status === 503) {
        setError('Les données sont temporairement indisponibles. Réessaie dans quelques instants.')
      } else {
        setError(json.error?.message ?? 'Une erreur est survenue.')
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

  function handleCheck(siren: string, checked: boolean) {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev)
      if (checked) next.add(siren)
      else next.delete(siren)
      return next
    })
  }

  function handleSelectAll() {
    if (!results) return
    const allSirens = results.results.map((c: { siren: string }) => c.siren)
    setSelected(new Set(allSirens))
  }

  function handleDeselectAll() {
    setSelected(new Set())
  }

  return (
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
        <>
          {/* Selection bar */}
          {selected.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-blue-700 font-medium">
                {selected.size} entreprise{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Tout désélectionner
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sauvegarder dans une liste
                </button>
              </div>
            </div>
          )}

          <ResultsList
            results={results}
            plan={plan}
            onPageChange={handlePageChange}
            selected={selected}
            onCheck={handleCheck}
            onSelectAll={handleSelectAll}
          />
        </>
      )}

      {showSaveModal && (
        <SaveToListModal
          sirens={Array.from(selected)}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => {
            setShowSaveModal(false)
            setSelected(new Set())
          }}
        />
      )}
    </div>
  )
}
