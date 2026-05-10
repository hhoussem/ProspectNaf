import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth()
  if (session) redirect('/search')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-bold text-gray-900">ProspectNAF</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Se connecter
          </Link>
          <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Commencer gratuitement
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-24 text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Trouvez vos prochains clients B2B
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mx-auto">
          Construisez en quelques minutes des listes d&apos;entreprises
          françaises à prospecter, à partir des données publiques Sirene.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Commencer gratuitement
          </Link>
          <Link href="/login" className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Se connecter
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-6 pt-12 text-left">
          <div className="space-y-2">
            <div className="text-2xl">🔍</div>
            <p className="font-semibold text-gray-900 text-sm">Recherche par secteur</p>
            <p className="text-sm text-gray-500">Filtrez par code NAF, localisation, taille et date de création.</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📋</div>
            <p className="font-semibold text-gray-900 text-sm">Listes organisées</p>
            <p className="text-sm text-gray-500">Sauvegardez vos résultats, annotez et suivez votre avancement.</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📥</div>
            <p className="font-semibold text-gray-900 text-sm">Export CSV</p>
            <p className="text-sm text-gray-500">Exportez vos listes pour les importer dans votre CRM.</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 pt-4">
          Données issues du registre national Sirene (INSEE) — Mise à jour quotidienne
        </p>
      </main>
    </div>
  )
}
