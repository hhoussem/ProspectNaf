import { z } from 'zod'

export const CreateListSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(80, 'Maximum 80 caractères'),
  sirens: z.array(z.string().regex(/^\d{9}$/, 'SIREN invalide')).optional(),
})

export const RenameListSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(80, 'Maximum 80 caractères'),
})

export const AddCompaniesSchema = z.object({
  sirens: z
    .array(z.string().regex(/^\d{9}$/, 'SIREN invalide'))
    .min(1, 'Au moins un SIREN requis'),
})

export const UpdateAnnotationSchema = z.object({
  status: z
    .enum(['UNTREATED', 'TO_CONTACT', 'IN_PROGRESS', 'INTERESTING', 'NOT_RELEVANT', 'ARCHIVED'])
    .optional(),
  note: z.string().max(500, 'Maximum 500 caractères').optional().nullable(),
  isPriority: z.boolean().optional(),
})

export type CreateListInput = z.infer<typeof CreateListSchema>
export type AddCompaniesInput = z.infer<typeof AddCompaniesSchema>
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>
