'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SearchSchema, type SearchInput } from '@/lib/validators/search'
import NafAutocomplete from './NafAutocomplete'
import type { Plan } from '@/types/plan'

const EFFECTIF_OPTIONS = [
  { value: 'NN', label: 'Indépendant / 0 salarié' },
  { value: '01', label: '1 à 2 salariés' },
  { value: '02', label: '3 à 5 salariés' },
  { value: '03', label: '6 à 9 salariés' },
  { value: '11', label: '10 à 19 salariés' },
  { value: '12', label: '20 à 49 salariés' },
  { value: '21', label: '50 à 99 salariés' },
  { value: '22', label: '100 à 199 salariés' },
  { value: '31', label: '200 à 249 salariés' },
  { value: '32', label: '250 à 499 salariés' },
]

interface Props {
  onSearch: (params: SearchInput) => void
  loading: boolean
  plan: Plan
}

export default function SearchForm({ onSearch, loading, plan }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [nafItems, setNafItems] = useState<{ code: string; label: string }[]>([])
  // Location as free text, split on comma/semicolon
  const [locationText, setLocationText] = useState('')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SearchInput>({
    resolver: zodResolver(SearchSchema),
    defaultValues: { nafCodes: [], statut: 'ACTIF', page: 1, perPage: 25 },
  })

  function handleNafChange(items: { code: string; label: string }[]) {
    setNafItems(items)
    setValue('nafCodes', items.map((n) => n.code), { shouldValidate: true })
  }

  function onSubmit(data: SearchInput) {
    // Parse location text into array, filter empty strings
    const locations = locationText
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    // Strip empty date strings
    const cleaned: SearchInput = {
      ...data,
      locations: locations.length ? locations : undefined,
      dateFrom: data.dateFrom || undefined,
      dateTo: data.dateTo || undefined,
    }

    onSearch(cleaned)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl border shadow-sm p-6 space-y-5"
    >
      {/* Hidden field for nafCodes managed by NafAutocomplete */}
      <input type="hidden" {...register('nafCodes')} />

      {/* NAF */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Secteur d&apos;activité <span className="text-red-500">*</span>
        </label>
        <NafAutocomplete selected={nafItems} onChange={handleNafChange} maxItems={5} />
        {errors.nafCodes && (
          <p className="text-xs text-red-600 mt-1">{errors.nafCodes.message}</p>
        )}
      </div>

      {/* Localisation */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Localisation <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          id="location"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="75, 69, Paris, Rhône... (séparés par virgule)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Code département (75), nom de département ou région. Laisse vide pour une recherche nationale.
        </p>
      </div>

      {/* Effectif */}
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

      {/* Dates */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            Créées après
          </label>
          <input
            id="dateFrom"
            type="text"
            placeholder="2015"
            {...register('dateFrom')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.dateFrom && (
            <p className="text-xs text-red-600 mt-1">{errors.dateFrom.message}</p>
          )}
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
          {errors.dateTo && (
            <p className="text-xs text-red-600 mt-1">{errors.dateTo.message}</p>
          )}
        </div>
      </div>

      {/* Statut */}
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

      {/* Filtres avancés (plans payants) */}
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
            <div className="mt-3 pt-3 border-t space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Forme juridique</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '5710,5720', label: 'SAS / SASU' },
                    { value: '5498,5499', label: 'SARL / EURL' },
                    { value: '5599', label: 'SA' },
                    { value: '1000,1100', label: 'Auto-entrepreneur / EI' },
                    { value: '9220', label: 'Association' },
                    { value: '6540', label: 'Société civile' },
                  ].map((f) => (
                    <label key={f.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        value={f.value}
                        {...register('formes')}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || nafItems.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Recherche en cours...' : 'Rechercher'}
      </button>
    </form>
  )
}
