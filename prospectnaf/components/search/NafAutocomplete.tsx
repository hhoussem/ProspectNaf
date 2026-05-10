'use client'

import { useState, useRef, useEffect } from 'react'
import { searchNafSync, type NafEntry } from '@/lib/naf'

interface Props {
  selected: { code: string; label: string }[]
  onChange: (items: { code: string; label: string }[]) => void
  maxItems?: number
}

export default function NafAutocomplete({ selected, onChange, maxItems = 5 }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NafEntry[]>([])
  const [nafData, setNafData] = useState<NafEntry[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load NAF data once
  useEffect(() => {
    fetch('/naf-codes.json')
      .then((r) => r.json())
      .then(setNafData)
      .catch(() => {/* fallback to API */})
  }, [])

  function handleInput(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        if (nafData.length > 0) {
          setSuggestions(searchNafSync(value, nafData))
        } else {
          // Fallback to API
          fetch(`/api/naf/autocomplete?q=${encodeURIComponent(value)}`)
            .then((r) => r.json())
            .then((d) => setSuggestions(d.results ?? []))
        }
        setOpen(true)
      } else {
        setSuggestions([])
        setOpen(false)
      }
    }, 150)
  }

  function select(entry: NafEntry) {
    if (selected.find((s) => s.code === entry.code)) return
    if (selected.length >= maxItems) return
    onChange([...selected, { code: entry.code, label: entry.label }])
    setQuery('')
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(code: string) {
    onChange(selected.filter((s) => s.code !== code))
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500">
        {selected.map((s) => (
          <span
            key={s.code}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium"
          >
            {s.code} — {s.label.slice(0, 30)}{s.label.length > 30 ? '…' : ''}
            <button
              type="button"
              onClick={() => remove(s.code)}
              aria-label={`Retirer ${s.code}`}
              className="hover:text-blue-600 ml-0.5"
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
            placeholder={selected.length === 0 ? 'Ex : agence web, 6201Z, restaurant...' : ''}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
            aria-label="Rechercher un secteur d'activité"
            aria-autocomplete="list"
            aria-expanded={open}
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s) => (
            <li
              key={s.code}
              role="option"
              aria-selected={!!selected.find((sel) => sel.code === s.code)}
              onMouseDown={() => select(s)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2"
            >
              <span className="font-mono text-xs text-gray-500 w-12 shrink-0">{s.code}</span>
              <span className="text-gray-800">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      {selected.length >= maxItems && (
        <p className="text-xs text-gray-400 mt-1">Maximum {maxItems} codes NAF</p>
      )}
    </div>
  )
}
