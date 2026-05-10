'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ListSummary } from '@/types/list'

interface Props {
  sirens: string[]
  onClose: () => void
  onSaved: () => void
}

export default function SaveToListModal({ sirens, onClose, onSaved }: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ added: number; alreadyPresent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((d) => setLists(d.lists ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function saveToList(listId: string) {
    setSaving(listId)
    setError(null)
    const res = await fetch(`/api/lists/${listId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sirens }),
    })
    setSaving(null)
    const json = await res.json()
    if (!res.ok) {
      setError(json.error?.message ?? 'Impossible de sauvegarder.')
      return
    }
    setResult({ added: json.added, alreadyPresent: json.alreadyPresent })
  }

  async function createAndSave(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)

    // Create list
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), sirens }),
    })
    setCreating(false)
    const json = await res.json()
    if (!res.ok) {
      setError(json.error?.message ?? 'Impossible de créer la liste.')
      return
    }
    setResult({ added: sirens.length, alreadyPresent: 0 })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sauvegarder dans une liste"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Sauvegarder {sirens.length} entreprise{sirens.length > 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <p className="font-medium">Sauvegarde réussie</p>
              <p>{result.added} ajoutée{result.added > 1 ? 's' : ''}{result.alreadyPresent > 0 ? `, ${result.alreadyPresent} déjà présente${result.alreadyPresent > 1 ? 's' : ''}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/lists"
                className="flex-1 text-center text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Voir mes listes
              </Link>
              <button
                onClick={onSaved}
                className="flex-1 text-sm border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Continuer la recherche
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
            ) : (
              <div className="space-y-3">
                {/* Existing lists */}
                {lists.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Listes existantes</p>
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => saveToList(list.id)}
                        disabled={saving !== null}
                        className="w-full text-left px-3 py-2.5 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <p className="text-sm font-medium text-gray-900">{list.name}</p>
                        <p className="text-xs text-gray-400">{list.companyCount} entreprise{list.companyCount > 1 ? 's' : ''}</p>
                        {saving === list.id && <span className="text-xs text-blue-600">Sauvegarde...</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Create new list */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Nouvelle liste</p>
                  <form onSubmit={createAndSave} className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nom de la liste..."
                      maxLength={80}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={creating || !newName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {creating ? '...' : 'Créer'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
