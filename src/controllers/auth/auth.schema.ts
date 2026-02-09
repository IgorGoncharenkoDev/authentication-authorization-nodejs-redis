import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
})

export const loginSchema = z.object({
  email: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  twoFAToken: z.string().optional(),
})
