import { Request, Response } from 'express'
import { generateSecret, generateURI, verify } from 'otplib'

import { redis } from '@/config/redis'
import { getClientIp } from '@/lib/getClientIp'
import { User } from '@/models/user.model'
import { keyGenAuthFns } from '@/redis/keys'
import { TwoFAAuthRequest } from '@/types/types'

export async function twoFASetupHandler(req: Request, res: Response) {
  const authReq = req as TwoFAAuthRequest
  const authUser = authReq.user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const user = await User.findById(authUser.id)

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const secret = generateSecret()

    const issuer = 'Nodejs Auth App'

    const otpAuthUrl = generateURI({
      label: user.email,
      issuer,
      secret,
    })

    user.twoFASecret = secret
    user.twoFAEnabled = false

    await user.save()

    return res.json({
      message: 'Two factor authentication setup successful',
      otpAuthUrl,
      secret,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function twoFAVerifyHandler(req: Request, res: Response) {
  const authReq = req as TwoFAAuthRequest
  const authUser = authReq.user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { code } = req.body as { code?: string }

  if (!code) {
    return res.status(400).json({ message: 'Two Factor Code is required' })
  }

  const clientIp = getClientIp(req)
  const ipAttemptsKey = keyGenAuthFns.twoFAIp(clientIp)

  try {
    const user = await User.findById(authUser.id)

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!user.twoFASecret) {
      return res.status(400).json({ message: 'Two factor is not set up' })
    }

    const userAttemptsKey = keyGenAuthFns.twoFAUser(user.id)

    // generate code for debugging
    // const code = await generate({ secret: user.twoFASecret })
    // console.log('code ->', code)

    const { valid } = await verify({
      token: code,
      secret: user.twoFASecret,
    })

    if (!valid) {
      const userAttempts = await redis.incr(userAttemptsKey)
      const ipAttempts = await redis.incr(ipAttemptsKey)

      if (ipAttempts === 1) await redis.expire(ipAttemptsKey, 300)
      if (userAttempts === 1) await redis.expire(userAttemptsKey, 300)

      if (ipAttempts >= 10) {
        return res
          .status(429)
          .json({ message: 'Too many attempts from this IP. Try again later' })
      }

      if (userAttempts >= 10) {
        return res
          .status(429)
          .json({ message: 'Too many 2FA attempts. Try again later' })
      }

      return res.status(400).json({ message: 'Invalid Two Factor Code' })
    }

    user.twoFAEnabled = true
    await user.save()

    await redis.del(ipAttemptsKey)
    await redis.del(userAttemptsKey)

    return res.json({
      message: 'Two factor authentication enabled successfully',
      twoFAEnabled: true,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
