import { z } from 'zod'

export const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(['user', 'admin', 'superadmin']).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.role !== undefined,
    {
      message: 'Either name or role must be provided.',
    }
  )

type UpdateUserInput = z.infer<typeof updateUserSchema>