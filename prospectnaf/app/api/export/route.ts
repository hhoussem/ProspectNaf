import { NextRequest } from 'next/server'
import Papa from 'papaparse'
import { format } from 'date-fns'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/quota'
import { apiError, slugify } from '@/lib/utils'
import { EFFECTIF_LABELS } from '@/types/company'
import type { Plan } from '@/types/plan'

const CSV_COLUMNS = [
  'siren', 'siret_siege', 'denomination',
  'adresse_numero', 'adresse_voie', 'code_postal', 'ville',
  'departement', 'region', 'code_naf', 'libelle_naf',
  'tranche_effectif', 'date_creation', 'forme_juridique',
  'statut', 'statut_annotation', 'note', 'priorite', 'date_ajout_liste',
]

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Non authentifié', 401)

    const plan = session.user.plan as Plan
    const limits = PLAN_LIMITS[plan]

    if (!limits.canExport) {
      return apiError('FORBIDDEN', "L'export CSV nécessite un plan payant", 403)
    }

    const listId = req.nextUrl.searchParams.get('listId')
    if (!listId) return apiError('VALIDATION_ERROR', 'listId requis', 400)

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        companies: {
          orderBy: { addedAt: 'asc' },
          take: limits.exportRowLimit ?? undefined,
        },
      },
    })

    if (!list || list.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Liste introuvable', 404)
    }

    // Fetch company data from Sirene local cache for each SIREN
    const sirens = list.companies.map((c) => c.siren)
    const sireneData = await prisma.sireneCompany.findMany({
      where: { siren: { in: sirens } },
    })
    const sireneMap = new Map(sireneData.map((s) => [s.siren, s]))

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { csvSeparator: true },
    })
    const delimiter = user?.csvSeparator ?? ','

    const rows = list.companies.map((lc) => {
      const s = sireneMap.get(lc.siren)
      return {
        siren: lc.siren,
        siret_siege: s?.siretSiege ?? '',
        denomination: s?.denomination ?? '',
        adresse_numero: s?.adresseNumero ?? '',
        adresse_voie: s?.adresseVoie ?? '',
        code_postal: s?.codePostal ?? '',
        ville: s?.ville ?? '',
        departement: s?.codeDept ?? '',
        region: s?.codeRegion ?? '',
        code_naf: s?.codeNaf ?? '',
        libelle_naf: s?.libelleNaf ?? '',
        tranche_effectif: EFFECTIF_LABELS[s?.trancheEffectif ?? ''] ?? '',
        date_creation: s?.dateCreation ? format(s.dateCreation, 'dd/MM/yyyy') : '',
        forme_juridique: s?.formeJuridique ?? '',
        statut: s?.isActive ? 'Actif' : 'Fermé',
        statut_annotation: lc.status,
        note: lc.note ?? '',
        priorite: lc.isPriority ? 'Oui' : 'Non',
        date_ajout_liste: format(lc.addedAt, 'dd/MM/yyyy'),
      }
    })

    const csv = Papa.unparse(rows, { columns: CSV_COLUMNS, delimiter })
    const bom = '\uFEFF'
    const filename = `prospectnaf_${slugify(list.name)}_${format(new Date(), 'yyyyMMdd')}.csv`

    return new Response(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[export]', err)
    return apiError('INTERNAL_ERROR', 'Erreur serveur', 500)
  }
}
