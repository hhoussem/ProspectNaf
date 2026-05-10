'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SearchSchema, type SearchInput } from '@/lib/validators/search'
import NafAutocomplete from './NafAutocomplete'
import type { Plan } from '@/types/plan'

const EFFECTIF_OPTIONS = [
  { value: 'NN,00', label: 'Indépendant / 0 salarié' },
  { value: '01,02', label: '1 à 5 salariés' },
  { value: '03', label: '6 à 10 salariés' },
  { value: '11,12', label: '11 à 50 salariés' },
  { value: '21,22', label: '51 à 200 salariés' },
  { value: '31,32,41,42,51,52,53', label: 'Plus de 200 salariés' },
]

interface Props {
  onSearch: (params: SearchInput) => void
  loading: boolean
  plan: Plan
}

export default function SearchForm({ onSearch, loading, plan }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [nafCodes, setNafCodes] = useState<{ code: string; label: string }[]>([])

  const { register, handleSubmit, control, formState: { errors } } = useForm<SearchInput>({
    resolver: zodResolver(SearchSchema),
    defaultValues: { statut: 'ACTIF', page: 1, perPage: 25 },
  })

  function onSubmit(data: SearchInput) {
    onSearch({ ...data, nafCodes: nafCodes.map((n) => n.code) })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl border shadow-sm p-6 space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Secteur d&apos;activité <span className="text-red-500">*</span>
        </label>
        <NafAutocomplete
          selected={nafCodes}
          onChange={setNafCodes}
          maxItems={5}
        />
        {errors.nafCodes && (
          <p className="text-xs text-red-600 mt-1">{errors.nafCodes.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Localisation <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          id="location"
          type="text"
          placeholder="Paris, 75, Rhône, Île-de-France..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Laisse vide pour une recherche nationale</p>
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          Taille <span className="text-gray-400 font-normal">(optionnel)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EFFECTIF_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                value={opt.value}
                {...register('effectifs')}
                className="rounded border-gray-300 text-blue-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            Créées après
          </label>
          <input
            id="dateFrom"
            type="text"
            placeholder="2020"
            {...register('dateFrom')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
            Créées avant
          </label>
          <input
            id="dateTo"
            type="text"
            placeholder="2024"
            {...register('dateTo')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">Statut</p>
        <div className="flex gap-4">
          {(['ACTIF', 'FERME', 'TOUS'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="radio"
                value={s}
                {...register('statut')}
                className="text-blue-600"
              />
              {s === 'ACTIF' ? 'Actif' : s === 'FERME' ? 'Fermé' : 'Tous'}
            </label>
          ))}
        </div>
      </div>

      {plan !== 'FREE' && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:underline"
          >
            Filtres avancés {showAdvanced ? '▴' : '▾'}
          </button>

          {showAdvanced && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Forme juridique</p>
              <div className="grid grid-cols-2 gap-2">
                {['SAS/SASU', 'SARL/EURL', 'SA', 'Auto-entrepreneur/EI', 'Association', 'Autre'].map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      value={f}
                      {...register('formes')}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || nafCodes.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Recherche en cours...' : 'Rechercher'}
      </button>
    </form>
  )
}
