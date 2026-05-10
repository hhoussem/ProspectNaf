export interface Company {
  siren: string
  siretSiege: string
  denomination: string
  adresseNumero?: string | null
  adresseVoie?: string | null
  codePostal?: string | null
  ville?: string | null
  departement?: string | null
  region?: string | null
  codeNaf: string
  libelleNaf: string
  trancheEffectif?: string | null
  libelleEffectif: string
  dateCreation?: string | null
  formeJuridique?: string | null
  isActive: boolean
}

export const EFFECTIF_LABELS: Record<string, string> = {
  NN: 'Indépendant / 0 salarié',
  '00': 'Indépendant / 0 salarié',
  '01': '1 à 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés et plus',
}

export const FORME_JURIDIQUE_LABELS: Record<string, string> = {
  '5710': 'SAS',
  '5720': 'SASU',
  '5498': 'SARL',
  '5499': 'EURL',
  '5599': 'SA',
  '1000': 'Entrepreneur individuel',
  '5202': 'SNCF',
  '9220': 'Association loi 1901',
  '1100': 'Artisan-commerçant',
  '6540': 'Société civile',
}

export interface ListCompanyWithData extends Company {
  listCompanyId: string
  addedAt: string
  status: import('./plan').AnnotationStatus
  note?: string | null
  isPriority: boolean
}
