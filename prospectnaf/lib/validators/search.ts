import { z } from 'zod'

export const SearchSchema = z.object({
  nafCodes: z
    .array(z.string().regex(/^\d{4}[A-Z]$/, 'Code NAF invalide (format attendu : 4 chiffres + 1 lettre majuscule)'))
    .min(1, 'Au moins un code NAF est requis')
    .max(5, 'Maximum 5 codes NAF'),
  locations: z.array(z.string().min(1)).max(3, 'Maximum 3 zones géographiques').optional(),
  effectifs: z.array(z.string()).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}$/).optional()),
  dateTo: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}$/).optional()),
  statut: z.enum(['ACTIF', 'FERME', 'TOUS']).default('ACTIF'),
  formes: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(25),
})

export type SearchInput = z.infer<typeof SearchSchema>
