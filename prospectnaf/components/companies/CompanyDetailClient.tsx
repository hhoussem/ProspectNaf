'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { CompanyDetail } from '@/app/api/companies/[siren]/route'
import type { Plan } from '@/types/plan'
import { formatDate } from '@/lib/utils'
import SaveToListModal from '@/components/lists/SaveToListModal'

interface Props {
  siren: string
  plan: Plan
}

export default function CompanyDetailClient({ siren, plan }: Props) {
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)

  useEffect(() => {
    fetch(`/api/companies/${siren}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message)
        else setCompany(d.company)
      })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false))
  }, [siren])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-2">
          <p className="text-gray-600">{error ?? 'Entreprise introuvable.'}</p>
          <Link href="/search" className="text-blue-600 hover:underline text-sm">← Retour à la recherche</Link>
        </div>
      </div>
    )
  }

  const latestFinanceYear = Object.keys(company.finances).sort().reverse()[0]
  const latestFinance = latestFinanceYear ? company.finances[latestFinanceYear] : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{company.denomination}</h1>
            {company.sigle && (
              <span className="text-sm text-gray-500 font-mono">({company.sigle})</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {company.isActive ? 'Actif' : 'Fermé'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            SIREN : <span className="font-mono">{company.siren}</span>
            {company.siretSiege && (
              <> · SIRET siège : <span className="font-mono">{company.siretSiege}</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="shrink-0 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Ajouter à une liste
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations générales */}
        <section className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">Informations</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Secteur" value={`${company.codeNaf} — ${company.libelleNaf || company.codeNaf}`} />
            <Row label="Forme juridique" value={company.formeJuridique} />
            <Row label="Catégorie" value={company.categorieEntreprise} />
            <Row label="Effectif" value={company.libelleEffectif} />
            <Row label="Création" value={formatDate(company.dateCreation)} />
            <Row label="Établissements" value={`${company.nombreEtablissementsOuverts} ouverts / ${company.nombreEtablissements} total`} />
          </dl>
        </section>

        {/* Adresse */}
        <section className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">Siège social</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Adresse" value={company.adresse} />
            <Row label="Code postal" value={company.codePostal} />
            <Row label="Ville" value={company.ville} />
            <Row label="Département" value={company.departement} />
          </dl>
          {company.latitude && company.longitude && (
            <a
              href={`https://www.google.com/maps?q=${company.latitude},${company.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Voir sur Google Maps ↗
            </a>
          )}
        </section>

        {/* Finances */}
        {latestFinance && (
          <section className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">
              Finances {latestFinanceYear}
            </h2>
            <dl className="space-y-2 text-sm">
              {latestFinance.ca != null && (
                <Row label="Chiffre d'affaires" value={formatAmount(latestFinance.ca)} />
              )}
              {latestFinance.resultat_net != null && (
                <Row label="Résultat net" value={formatAmount(latestFinance.resultat_net)} />
              )}
            </dl>
          </section>
        )}

        {/* Dirigeants */}
        {company.dirigeants.length > 0 && (
          <section className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">
              Dirigeants ({company.dirigeants.length})
            </h2>
            <ul className="space-y-2">
              {company.dirigeants.slice(0, 6).map((d, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-gray-800">
                    {d.type === 'personne_morale'
                      ? d.denomination
                      : [d.prenom, d.nom].filter(Boolean).join(' ')}
                  </span>
                  {d.qualite && (
                    <span className="text-gray-400 ml-2">· {d.qualite}</span>
                  )}
                  {d.type === 'personne_morale' && d.siren && (
                    <Link
                      href={`/companies/${d.siren}`}
                      className="text-xs text-blue-600 hover:underline ml-2"
                    >
                      {d.siren} ↗
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Liens externes */}
      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500 mb-3">Liens utiles</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://www.pappers.fr/entreprise/${company.siren}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Pappers ↗
          </a>
          <a
            href={`https://www.societe.com/societe/${company.denomination.toLowerCase().replace(/\s+/g, '-')}-${company.siren}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Société.com ↗
          </a>
          <a
            href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${company.siren}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Annuaire entreprises ↗
          </a>
          <a
            href={`https://www.infogreffe.fr/entreprise-societe/${company.siren}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Infogreffe ↗
          </a>
        </div>
      </section>

      {showSaveModal && (
        <SaveToListModal
          sirens={[company.siren]}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="text-gray-400 shrink-0 w-36">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  )
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
