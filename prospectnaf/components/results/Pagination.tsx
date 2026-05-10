'use client'

interface Props {
  currentPage: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export default function Pagination({ currentPage, totalItems, perPage, onPageChange, disabled }: Props) {
  const totalPages = Math.ceil(totalItems / perPage)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (currentPage <= 4) return i + 1
    if (currentPage >= totalPages - 3) return totalPages - 6 + i
    return currentPage - 3 + i
  })

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || disabled}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
        aria-label="Page précédente"
      >
        ←
      </button>

      {disabled ? (
        <span className="text-xs text-gray-500 px-3">
          Page 1 uniquement (plan gratuit)
        </span>
      ) : (
        pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              p === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            }`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        ))
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || disabled}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
        aria-label="Page suivante"
      >
        →
      </button>
    </nav>
  )
}
