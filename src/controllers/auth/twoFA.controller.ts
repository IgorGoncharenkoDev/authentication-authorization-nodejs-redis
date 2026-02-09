import { Request, Response } from 'express'
import { generateSecret, generateURI, verify } from 'otplib'

import { User } from '@/models/user.model'
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

  try {
    const user = await User.findById(authUser.id)

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!user.twoFASecret) {
      return res.status(400).json({ message: 'Two factor is not set up' })
    }

    // generate code for debugging
    // const code = await generate({ secret: user.twoFASecret })
    // console.log('code ->', code)

    const { valid } = await verify({
      token: code,
      secret: user.twoFASecret,
    })

    if (!valid) {
      return res.status(400).json({ message: 'Invalid Two Factor Code' })
    }

    user.twoFAEnabled = true
    await user.save()

    return res.json({
      message: 'Two factor authentication enabled successfully',
      twoFAEnabled: true,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
