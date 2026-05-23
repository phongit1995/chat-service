import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().trim().max(100, 'Full name is too long').optional().or(z.literal('')),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username is too long')
      .regex(/^[a-zA-Z0-9_.]+$/, 'Only letters, numbers, dot and underscore'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const profileSchema = z.object({
  fullName: z.string().trim().max(100, 'Full name is too long').optional().or(z.literal('')),
  bio: z.string().trim().max(500, 'Bio is too long').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone is too long')
    .optional()
    .or(z.literal('')),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
