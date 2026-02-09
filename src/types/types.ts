import { Request } from 'express'

export type UserRole = 'admin' | 'user' | 'superadmin'

export type AuthRequest = Request & {
  user: {
    email: string
    id: string
    name?: string | null
    role: UserRole
    isEmailVerified: boolean
  }
}

export type TwoFAAuthRequest = Request & { user: { id: string } }
