import jwt from 'jsonwebtoken'

import { UserRole } from '@/types/types'

export function createAccessToken(
  userId: string,
  role: UserRole,
  tokenVersion: number,
) {
  const payload = {
    subject: userId,
    role,
    tokenVersion,
  }

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: '30m',
  })
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
    subject: string
    role: UserRole
    tokenVersion: number
  }
}

export function createRefreshToken(userId: string, tokenVersion: number) {
  const payload = {
    subject: userId,
    tokenVersion,
  }

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  })
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
    subject: string
    tokenVersion: number
  }
}
