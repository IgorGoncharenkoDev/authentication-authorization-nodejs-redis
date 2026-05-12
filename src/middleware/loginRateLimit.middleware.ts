import { NextFunction, Request, Response } from 'express'

import { redis } from '@/config/redis'
import { keyGenAuthFns } from '@/redis/keys'

export const loginRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email = req.body.email

    const key = keyGenAuthFns.loginAttempts(email)

    const attempts = await redis.incr(key)

    if (attempts === 1) {
      await redis.expire(key, 900)
    }

    if (attempts > 5) {
      return res.status(429).json({ message: 'Too many login attempts' })
    }

    next()
  } catch (err) {
    next(err)
  }
}
