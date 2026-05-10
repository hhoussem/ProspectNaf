import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { apiError } from '@/lib/utils'
import { EFFECTIF_LABELS, FORME_JURIDIQUE_LABELS } from '@/types/company'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr'

export interface CompanyDetail {
  siren: string
  siretSiege: string
  denomination: string
  sigle: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  departement: string | null
  region: string | null
  latitude: string | null
  longitude: string | null
  codeNaf: string
  libelleNaf: string
  formeJuridique: string | null
  categorieEntreprise: string | null
  trancheEffectif: string | null
  libelleEffectif: string
  dateCreation: string | null
  isActive: boolean
  nombreEtablissements: number
  nombreEtablissementsOuverts: number
  dirigeants: Dirigeant[]
  finances: Record<string, { ca?: number; resultat_net?: number }>
}

export interface Dirigeant {
  nom?: string
  prenom?: string
  denomination?: string
  qualite?: string | null
  type: 'personne_physique' | 'personne_morale'
  siren?: string
}

function toApiNafCode(code: string): string {
  if (code.includes('.')) return code
  if (/^\d{4}[A-Z]$/.test(code)) return `${code.slice(0, 2)}.${code.slice(2)}`
  return code
}

export async function GET(req: NextRequest, { params }: { params: { siren: string } }) {
  const session = await auth()
  if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

  const { siren } = params
  if (!/^\d{9}$/.test(siren)) return apiError('VALIDATION_ERROR', 'SIREN invalide', 400)

  try {
    const res = await fetch(
      `${API_BASE}/search?q=${siren}&page=1&per_page=1`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    )

    if (!res.ok) return apiError('EXTERNAL_ERROR', 'API indisponible', 502)

    const data = await res.json()
    const raw = data.results?.[0]

    if (!raw || raw.siren !== siren) {
      return apiError('NOT_FOUND', 'Entreprise introuvable', 404)
    }

    const siege = raw.siege ?? {}

    const dirigeants: Dirigeant[] = (raw.dirigeants ?? []).map((d: Record<string, string>) => ({
      nom: d.nom,
      prenom: d.prenom,
      denomination: d.denomination,
      qualite: d.qualite,
      type: d.type_dirigeant === 'personne morale' ? 'personne_morale' : 'personne_physique',
      siren: d.siren,
    }))

    const detail: CompanyDetail = {
      siren: raw.siren,
      siretSiege: siege.siret ?? '',
      denomination: raw.nom_complet ?? '',
      sigle: raw.sigle ?? null,
      adresse: siege.adresse ?? null,
      codePostal: siege.code_postal ?? null,
      ville: siege.libelle_commune ?? null,
      departement: siege.departement ?? null,
      region: siege.region ?? null,
      latitude: siege.latitude ?? null,
      longitude: siege.longitude ?? null,
      codeNaf: raw.activite_principale ?? '',
      libelleNaf: '',  // not returned at top level — use siege
      formeJuridique: FORME_JURIDIQUE_LABELS[raw.nature_juridique ?? ''] ?? raw.nature_juridique ?? null,
      categorieEntreprise: raw.categorie_entreprise ?? null,
      trancheEffectif: raw.tranche_effectif_salarie ?? null,
      libelleEffectif: EFFECTIF_LABELS[raw.tranche_effectif_salarie ?? ''] ?? 'Non renseigné',
      dateCreation: raw.date_creation ?? null,
      isActive: raw.etat_administratif === 'A',
      nombreEtablissements: raw.nombre_etablissements ?? 0,
      nombreEtablissementsOuverts: raw.nombre_etablissements_ouverts ?? 0,
      dirigeants,
      finances: raw.finances ?? {},
    }

    return Response.json({ company: detail })
  } catch (err) {
    console.error('[companies/:siren]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
