import { NextFunction, Request, Response } from 'express'

import { redis } from '@/config/redis'
import { verifyAccessToken } from '@/lib/token'
import { User } from '@/models/user.model'
import { keyGenUserFns } from '@/redis/keys'
import { AuthRequest } from '@/types/types'

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyAccessToken(token)

    const authReq = req as AuthRequest

    const cachedUser = await redis.get(keyGenUserFns.userCache(payload.subject))

    if (cachedUser) {
      const parsedUser = JSON.parse(cachedUser)

      if (parsedUser.tokenVersion !== payload.tokenVersion) {
        return res.status(401).json({ message: 'Token expired' })
      }

      authReq.user = parsedUser
      return next()
    }

    const user = await User.findById(payload.subject)

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // checking token version for invalidation logic
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Token expired' })
    }

    const userDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      tokenVersion: user.tokenVersion,
    }

    await redis.set(
      keyGenUserFns.userCache(user.id),
      JSON.stringify(userDTO),
      'EX',
      300,
    )

    authReq.user = userDTO

    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export default requireAuth
