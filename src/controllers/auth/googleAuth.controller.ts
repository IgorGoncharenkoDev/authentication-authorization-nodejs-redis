import crypto from 'crypto'
import { Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'

import { hashPassword } from '@/lib/hash'
import { createAccessToken, createRefreshToken } from '@/lib/token'
import { User } from '@/models/user.model'

// if the frontend app exists
// const FRONTEND_URL = process.env.FRONTEND_URL!

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  if (!clientId || !clientSecret) {
    throw new Error('Google auth credentials not found!')
  }

  return new OAuth2Client({ clientId, clientSecret, redirectUri })
}

export async function startGoogleAuthHandler(req: Request, res: Response) {
  try {
    const client = getGoogleClient()
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['openid', 'profile', 'email'],
    })
    return res.redirect(authUrl)
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function googleAuthCallbackHandler(req: Request, res: Response) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ message: 'No code found in query params' })
  }

  try {
    const client = getGoogleClient()
    const { tokens } = await client.getToken(String(code))

    if (!tokens.id_token) {
      return res.status(400).json({ message: 'Invalid google id_token' })
    }

    // verify google id_token and read the user info from the token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    })

    const payload = ticket.getPayload()
    const email = payload?.email
    const isEmailVerified = payload?.email_verified

    if (!email || !isEmailVerified) {
      return res
        .status(400)
        .json({ message: 'Email is not verified by google' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // preventing auth with google is user has already registered/logged in with this email
    let user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      const tempPassword = crypto.randomBytes(16).toString('hex')
      const passwordHash = await hashPassword(tempPassword)

      user = await User.create({
        email: normalizedEmail,
        passwordHash,
        role: 'user',
        isEmailVerified: true,
        twoFAEnabled: false,
      })
    } else {
      if (!user.isEmailVerified) {
        user.isEmailVerified = true
        await user.save()
      }
    }

    const accessToken = createAccessToken(user.id, user.role, user.tokenVersion)
    const refreshToken = createRefreshToken(user.id, user.tokenVersion)

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // if the frontend app exists
    // return res.redirect(`${FRONTEND_URL}/dashboard`)

    return res.json({
      message: 'Google auth successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
