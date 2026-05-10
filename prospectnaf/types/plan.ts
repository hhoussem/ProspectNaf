export type Plan = 'FREE' | 'SOLO' | 'PRO'

export type AnnotationStatus =
  | 'UNTREATED'
  | 'TO_CONTACT'
  | 'IN_PROGRESS'
  | 'INTERESTING'
  | 'NOT_RELEVANT'
  | 'ARCHIVED'

export const ANNOTATION_STATUS_LABELS: Record<AnnotationStatus, string> = {
  UNTREATED: 'Non traité',
  TO_CONTACT: 'À contacter',
  IN_PROGRESS: 'En cours',
  INTERESTING: 'Intéressant',
  NOT_RELEVANT: 'Pas pertinent',
  ARCHIVED: 'Archivé',
}

export const ANNOTATION_STATUS_COLORS: Record<AnnotationStatus, string> = {
  UNTREATED: 'bg-gray-100 text-gray-600',
  TO_CONTACT: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  INTERESTING: 'bg-green-100 text-green-700',
  NOT_RELEVANT: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-200 text-gray-700',
}
