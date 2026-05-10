'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Plan } from '@/types/plan'
import type { ListSummary } from '@/types/list'
import { formatDate } from '@/lib/utils'
import { PLAN_LIMITS } from '@/lib/quota'

interface Props {
  plan: Plan
}

export default function ListsClient({ plan }: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const limits = PLAN_LIMITS[plan]
  const canCreate = limits.maxLists === null || lists.length < limits.maxLists

  const fetchLists = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/lists')
    if (res.ok) {
      const data = await res.json()
      setLists(data.lists)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLists() }, [fetchLists])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setCreating(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error?.message ?? 'Impossible de créer la liste.')
      return
    }
    setNewName('')
    setShowCreate(false)
    fetchLists()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la liste "${name}" ? Cette action est irréversible.`)) return
    setDeletingId(id)
    await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setLists((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {lists.length} liste{lists.length > 1 ? 's' : ''}
            {limits.maxLists !== null && ` / ${limits.maxLists}`}
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nouvelle liste
            </button>
          )}
          {!canCreate && (
            <p className="text-xs text-gray-500">
              Limite atteinte.{' '}
              <a href="/account" className="text-blue-600 hover:underline">Passer au plan Solo</a>
            </p>
          )}
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la liste (max 80 caractères)"
              maxLength={80}
              autoFocus
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName('') }}
              className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Chargement...</div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Aucune liste pour l&apos;instant. Crée-en une depuis la page de recherche.
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white border rounded-lg p-4 flex items-center justify-between hover:border-blue-200 transition-colors"
              >
                <Link href={`/lists/${list.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{list.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {list.companyCount} entreprise{list.companyCount > 1 ? 's' : ''} · Modifiée le {formatDate(list.updatedAt)}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(list.id, list.name)}
                  disabled={deletingId === list.id}
                  aria-label={`Supprimer la liste ${list.name}`}
                  className="ml-4 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                >
                  {deletingId === list.id ? '...' : 'Supprimer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
