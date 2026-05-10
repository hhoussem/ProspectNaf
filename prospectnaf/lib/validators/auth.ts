import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

export const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: passwordSchema,
  firstName: z.string().min(1).max(50).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
