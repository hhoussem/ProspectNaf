'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Plan, AnnotationStatus } from '@/types/plan'
import { ANNOTATION_STATUS_LABELS, ANNOTATION_STATUS_COLORS } from '@/types/plan'
import { PLAN_LIMITS } from '@/lib/quota'
import { formatDate } from '@/lib/utils'

interface ListCompany {
  id: string
  siren: string
  addedAt: string
  status: AnnotationStatus
  note: string | null
  isPriority: boolean
}

interface ListData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  companies: ListCompany[]
}

interface Props {
  listId: string
  plan: Plan
}

export default function ListDetailClient({ listId, plan }: Props) {
  const [list, setList] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<AnnotationStatus | 'ALL'>('ALL')
  const [exporting, setExporting] = useState(false)

  const canAnnotate = PLAN_LIMITS[plan].canAnnotate
  const canExport = PLAN_LIMITS[plan].canExport

  const fetchList = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/lists/${listId}`)
    if (res.ok) {
      const data = await res.json()
      setList(data.list)
      setNewName(data.list.name)
    }
    setLoading(false)
  }, [listId])

  useEffect(() => { fetchList() }, [fetchList])

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !list) return
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      setList((prev) => prev ? { ...prev, name: newName.trim() } : prev)
      setRenaming(false)
    }
  }

  async function handleAnnotation(siren: string, data: Partial<{ status: AnnotationStatus; note: string | null; isPriority: boolean }>) {
    const res = await fetch(`/api/lists/${listId}/companies/${siren}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setList((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          companies: prev.companies.map((c) =>
            c.siren === siren ? { ...c, ...data } : c
          ),
        }
      })
    }
  }

  async function handleRemoveCompany(siren: string) {
    await fetch(`/api/lists/${listId}/companies/${siren}`, { method: 'DELETE' })
    setList((prev) => {
      if (!prev) return prev
      return { ...prev, companies: prev.companies.filter((c) => c.siren !== siren) }
    })
  }

  async function handleExport() {
    setExporting(true)
    const res = await fetch(`/api/export?listId=${listId}`)
    setExporting(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error?.message ?? 'Export impossible.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCompanies = list?.companies.filter(
    (c) => filterStatus === 'ALL' || c.status === filterStatus
  ) ?? []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-600">Liste introuvable.</p>
          <Link href="/lists" className="text-blue-600 hover:underline text-sm">Retour aux listes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/lists" className="text-gray-400 hover:text-gray-600 text-sm">← Listes</Link>
            {renaming ? (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={80}
                  autoFocus
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="text-xs text-blue-600 hover:underline">Enregistrer</button>
                <button type="button" onClick={() => { setRenaming(false); setNewName(list.name) }} className="text-xs text-gray-400 hover:underline">Annuler</button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{list.name}</h1>
                <button onClick={() => setRenaming(true)} className="text-xs text-gray-400 hover:text-gray-600">Renommer</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canExport ? (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {exporting ? 'Export...' : 'Exporter CSV'}
              </button>
            ) : (
              <a href="/account" className="text-xs text-gray-500 hover:underline">
                Export CSV (plan payant)
              </a>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {list.companies.length} entreprise{list.companies.length > 1 ? 's' : ''} · Créée le {formatDate(list.createdAt)}
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filtre par statut */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}
          >
            Tous ({list.companies.length})
          </button>
          {(Object.keys(ANNOTATION_STATUS_LABELS) as AnnotationStatus[]).map((s) => {
            const count = list.companies.filter((c) => c.status === s).length
            if (count === 0) return null
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}
              >
                {ANNOTATION_STATUS_LABELS[s]} ({count})
              </button>
            )
          })}
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucune entreprise dans cette liste.</div>
        ) : (
          <div className="space-y-2">
            {filteredCompanies.map((company) => (
              <CompanyRow
                key={company.siren}
                company={company}
                canAnnotate={canAnnotate}
                onAnnotate={(data) => handleAnnotation(company.siren, data)}
                onRemove={() => handleRemoveCompany(company.siren)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CompanyRowProps {
  company: ListCompany
  canAnnotate: boolean
  onAnnotate: (data: Partial<{ status: AnnotationStatus; note: string | null; isPriority: boolean }>) => void
  onRemove: () => void
}

function CompanyRow({ company, canAnnotate, onAnnotate, onRemove }: CompanyRowProps) {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState(company.note ?? '')
  const [saving, setSaving] = useState(false)

  async function saveNote() {
    setSaving(true)
    await onAnnotate({ note: note || null })
    setSaving(false)
  }

  return (
    <div className={`bg-white border rounded-lg p-4 space-y-3 ${company.isPriority ? 'border-orange-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {company.isPriority && <span className="text-orange-500 text-xs">★</span>}
            <p className="font-medium text-sm text-gray-900">SIREN : {company.siren}</p>
            <a
              href={`https://www.pappers.fr/entreprise/${company.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Pappers ↗
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Ajoutée le {formatDate(company.addedAt)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canAnnotate ? (
            <select
              value={company.status}
              onChange={(e) => onAnnotate({ status: e.target.value as AnnotationStatus })}
              className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${ANNOTATION_STATUS_COLORS[company.status]}`}
              aria-label="Statut de l'entreprise"
            >
              {(Object.keys(ANNOTATION_STATUS_LABELS) as AnnotationStatus[]).map((s) => (
                <option key={s} value={s}>{ANNOTATION_STATUS_LABELS[s]}</option>
              ))}
            </select>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ANNOTATION_STATUS_COLORS[company.status]}`}>
              {ANNOTATION_STATUS_LABELS[company.status]}
            </span>
          )}

          {canAnnotate && (
            <button
              onClick={() => onAnnotate({ isPriority: !company.isPriority })}
              aria-label={company.isPriority ? 'Retirer la priorité' : 'Marquer comme prioritaire'}
              className={`text-sm ${company.isPriority ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'} transition-colors`}
            >
              ★
            </button>
          )}

          <button
            onClick={onRemove}
            aria-label="Retirer de la liste"
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {canAnnotate && (
        <div>
          {!showNote && !company.note ? (
            <button
              onClick={() => setShowNote(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              + Ajouter une note
            </button>
          ) : (
            <div className="space-y-1">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onFocus={() => setShowNote(true)}
                onBlur={saveNote}
                maxLength={500}
                rows={2}
                placeholder="Note (max 500 caractères)..."
                className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-300 text-right">{note.length}/500 {saving ? '· Enregistrement...' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
