export interface GeoResult {
  type: 'commune' | 'departement' | 'region'
  code: string
  label: string
}

// Minimal static geo data — departments and regions
// In production, this would be a full communes dataset
const DEPARTEMENTS: GeoResult[] = [
  { type: 'departement', code: '01', label: 'Ain' },
  { type: 'departement', code: '02', label: 'Aisne' },
  { type: 'departement', code: '03', label: 'Allier' },
  { type: 'departement', code: '06', label: 'Alpes-Maritimes' },
  { type: 'departement', code: '13', label: 'Bouches-du-Rhône' },
  { type: 'departement', code: '14', label: 'Calvados' },
  { type: 'departement', code: '21', label: 'Côte-d\'Or' },
  { type: 'departement', code: '25', label: 'Doubs' },
  { type: 'departement', code: '31', label: 'Haute-Garonne' },
  { type: 'departement', code: '33', label: 'Gironde' },
  { type: 'departement', code: '34', label: 'Hérault' },
  { type: 'departement', code: '35', label: 'Ille-et-Vilaine' },
  { type: 'departement', code: '38', label: 'Isère' },
  { type: 'departement', code: '44', label: 'Loire-Atlantique' },
  { type: 'departement', code: '45', label: 'Loiret' },
  { type: 'departement', code: '54', label: 'Meurthe-et-Moselle' },
  { type: 'departement', code: '57', label: 'Moselle' },
  { type: 'departement', code: '59', label: 'Nord' },
  { type: 'departement', code: '62', label: 'Pas-de-Calais' },
  { type: 'departement', code: '63', label: 'Puy-de-Dôme' },
  { type: 'departement', code: '67', label: 'Bas-Rhin' },
  { type: 'departement', code: '68', label: 'Haut-Rhin' },
  { type: 'departement', code: '69', label: 'Rhône' },
  { type: 'departement', code: '75', label: 'Paris' },
  { type: 'departement', code: '76', label: 'Seine-Maritime' },
  { type: 'departement', code: '77', label: 'Seine-et-Marne' },
  { type: 'departement', code: '78', label: 'Yvelines' },
  { type: 'departement', code: '80', label: 'Somme' },
  { type: 'departement', code: '83', label: 'Var' },
  { type: 'departement', code: '84', label: 'Vaucluse' },
  { type: 'departement', code: '91', label: 'Essonne' },
  { type: 'departement', code: '92', label: 'Hauts-de-Seine' },
  { type: 'departement', code: '93', label: 'Seine-Saint-Denis' },
  { type: 'departement', code: '94', label: 'Val-de-Marne' },
  { type: 'departement', code: '95', label: 'Val-d\'Oise' },
]

const REGIONS: GeoResult[] = [
  { type: 'region', code: '11', label: 'Île-de-France' },
  { type: 'region', code: '24', label: 'Centre-Val de Loire' },
  { type: 'region', code: '27', label: 'Bourgogne-Franche-Comté' },
  { type: 'region', code: '28', label: 'Normandie' },
  { type: 'region', code: '32', label: 'Hauts-de-France' },
  { type: 'region', code: '44', label: 'Grand Est' },
  { type: 'region', code: '52', label: 'Pays de la Loire' },
  { type: 'region', code: '53', label: 'Bretagne' },
  { type: 'region', code: '75', label: 'Nouvelle-Aquitaine' },
  { type: 'region', code: '76', label: 'Occitanie' },
  { type: 'region', code: '84', label: 'Auvergne-Rhône-Alpes' },
  { type: 'region', code: '93', label: 'Provence-Alpes-Côte d\'Azur' },
]

const ALL_GEO = [...DEPARTEMENTS, ...REGIONS]

export function searchGeo(query: string): GeoResult[] {
  if (query.length < 2) return []
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return ALL_GEO.filter((g) => {
    const label = g.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return label.includes(q) || g.code.startsWith(q)
  }).slice(0, 10)
}

export function resolveToApiParams(locations: GeoResult[]): {
  departement?: string
  commune?: string
} {
  const depts = locations
    .filter((l) => l.type === 'departement')
    .map((l) => l.code)

  const communes = locations
    .filter((l) => l.type === 'commune')
    .map((l) => l.code)

  return {
    departement: depts.length ? depts.join(',') : undefined,
    commune: communes.length ? communes.join(',') : undefined,
  }
}
