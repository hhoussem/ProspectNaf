'use client'

import { useState, useRef } from 'react'
import type { GeoSuggestion } from '@/app/api/geo/autocomplete/route'

const TYPE_ICONS: Record<GeoSuggestion['type'], string> = {
  region: '🗺',
  departement: '📍',
  commune: '🏙',
}

const TYPE_LABELS: Record<GeoSuggestion['type'], string> = {
  region: 'Région',
  departement: 'Département',
  commune: 'Commune',
}

interface Props {
  selected: GeoSuggestion[]
  onChange: (items: GeoSuggestion[]) => void
  maxItems?: number
}

export default function LocationAutocomplete({ selected, onChange, maxItems = 3 }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleInput(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 2) {
        const res = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(value)}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
        setOpen(true)
      } else {
        setSuggestions([])
        setOpen(false)
      }
    }, 200)
  }

  function select(item: GeoSuggestion) {
    if (selected.find((s) => s.code === item.code && s.type === item.type)) return
    if (selected.length >= maxItems) return
    onChange([...selected, item])
    setQuery('')
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(code: string, type: string) {
    onChange(selected.filter((s) => !(s.code === code && s.type === type)))
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500">
        {selected.map((s) => (
          <span
            key={`${s.type}-${s.code}`}
            className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium"
          >
            {TYPE_ICONS[s.type]} {s.label}
            <button
              type="button"
              onClick={() => remove(s.code, s.type)}
              aria-label={`Retirer ${s.label}`}
              className="hover:text-green-600 ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        {selected.length < maxItems && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => query.length >= 2 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={selected.length === 0 ? 'Lyon, Rhône, Île-de-France...' : ''}
            className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
            aria-label="Rechercher une localisation"
            aria-autocomplete="list"
            aria-expanded={open}
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((s) => (
            <li
              key={`${s.type}-${s.code}`}
              role="option"
              aria-selected={!!selected.find((sel) => sel.code === s.code && sel.type === s.type)}
              onMouseDown={() => select(s)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2"
            >
              <span className="text-base">{TYPE_ICONS[s.type]}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-800">{s.label}</span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{TYPE_LABELS[s.type]}</span>
            </li>
          ))}
        </ul>
      )}

      {open && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Aucun résultat
        </div>
      )}

      {selected.length >= maxItems && (
        <p className="text-xs text-gray-400 mt-1">Maximum {maxItems} zones géographiques</p>
      )}
    </div>
  )
}
