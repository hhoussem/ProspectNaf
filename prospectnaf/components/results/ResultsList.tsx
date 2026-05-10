'use client'

import CompanyCard from './CompanyCard'
import Pagination from './Pagination'
import type { SearchResult } from '@/lib/sirene'
import type { Plan } from '@/types/plan'

interface Props {
  results: SearchResult
  plan: Plan
  onPageChange: (page: number) => void
  selected?: Set<string>
  onCheck?: (siren: string, checked: boolean) => void
  onSelectAll?: () => void
}

export default function ResultsList({ results, plan, onPageChange, selected, onCheck, onSelectAll }: Props) {
  const { total, page, perPage, results: companies, source } = results

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700" aria-live="polite">
            {total.toLocaleString('fr-FR')} entreprise{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
          </p>
          {source === 'cache' && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">cache</span>
          )}
          {source === 'local' && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              données locales
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              Tout sélectionner
            </button>
          )}
          {plan === 'FREE' && (
            <p className="text-xs text-gray-500">
              Plan gratuit — 20 résultats max.{' '}
              <a href="/account" className="text-blue-600 hover:underline">Passer au plan Solo</a>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {companies.map((company) => (
          <CompanyCard
            key={company.siren}
            company={company}
            showCheckbox={!!onCheck}
            checked={selected?.has(company.siren) ?? false}
            onCheck={onCheck}
          />
        ))}
      </div>

      {total > perPage && (
        <Pagination
          currentPage={page}
          totalItems={total}
          perPage={perPage}
          onPageChange={onPageChange}
          disabled={plan === 'FREE'}
        />
      )}
    </div>
  )
}
