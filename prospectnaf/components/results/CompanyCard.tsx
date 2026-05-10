'use client'

import { useState } from 'react'
import type { Company } from '@/types/company'
import { formatDate } from '@/lib/utils'

interface Props {
  company: Company
  showCheckbox?: boolean
  checked?: boolean
  onCheck?: (siren: string, checked: boolean) => void
}

export default function CompanyCard({ company, showCheckbox, checked, onCheck }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = [
      company.denomination,
      [company.adresseNumero, company.adresseVoie].filter(Boolean).join(' '),
      [company.codePostal, company.ville].filter(Boolean).join(' '),
      `SIREN : ${company.siren}`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 transition-colors">
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheck?.(company.siren, e.target.checked)}
            aria-label={`Sélectionner ${company.denomination}`}
            className="mt-1 rounded border-gray-300 text-blue-600"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {company.denomination}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  company.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {company.isActive ? 'Actif ✓' : 'Fermé'}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {[company.ville, company.departement].filter(Boolean).join(', ')}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span>
              <span className="font-mono text-gray-400">{company.codeNaf}</span>
              {' — '}
              {company.libelleNaf}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{company.libelleEffectif}</span>
            <span>Créée le {formatDate(company.dateCreation)}</span>
            <span>SIREN : {company.siren}</span>
            {company.formeJuridique && <span>{company.formeJuridique}</span>}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <a
              href={`https://www.pappers.fr/entreprise/${company.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Pappers ↗
            </a>
            <a
              href={`https://www.societe.com/societe/${company.denomination.toLowerCase().replace(/\s+/g, '-')}-${company.siren}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Société.com ↗
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
