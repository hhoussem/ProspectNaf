import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          Trouvez vos prochains clients B2B
        </h1>
        <p className="text-xl text-gray-600">
          ProspectNAF vous permet de construire en quelques minutes une liste d&apos;entreprises
          françaises à prospecter, à partir des données publiques Sirene.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Se connecter
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Données issues du registre national Sirene (INSEE) — Mise à jour quotidienne
        </p>
      </div>
    </main>
  )
}
