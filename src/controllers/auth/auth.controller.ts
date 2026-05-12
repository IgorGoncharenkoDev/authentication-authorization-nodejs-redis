import crypto from 'crypto'

import { Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { verify } from 'otplib'
import { ZodError } from 'zod'

import { chalkError } from '@/config/chalk'
import { chalkInfo } from '@/config/chalk'
import { redis } from '@/config/redis'
import { loginSchema, registerSchema } from '@/controllers/auth/auth.schema'
import { sendEmail } from '@/lib/email'
import { getClientIp } from '@/lib/getClientIp'
import { comparePassword, hashPassword } from '@/lib/hash'
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '@/lib/token'
import { User } from '@/models/user.model'
import { keyGenAuthFns, keyGenSessionFns } from '@/redis/keys'

type ZodIssue = ZodError<unknown>['issues'][number]

export function zodIssuesToFieldErrors(
  issues: ZodIssue[],
): Record<string, string[]> {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    const field = issue.path.join('.') || 'form'

    if (!acc[field]) {
      acc[field] = []
    }

    acc[field].push(issue.message)
    return acc
  }, {})
}

function getNormalizedEmail(email: string) {
  return email.toLowerCase().trim()
}

function getAppUrl() {
  const port = process.env.PORT ?? '4000'
  const host = process.env.APP_HOST ?? 'localhost'
  return `http://${host}:${port}`
}

export async function registerHandler(req: Request, res: Response) {
  try {
    const result = registerSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid data',
        errors: zodIssuesToFieldErrors(result.error.issues),
      })
    }

    const { name, email, password } = result.data

    const normalizedEmail = getNormalizedEmail(email)
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use!' })
    }

    const passwordHash = await hashPassword(password)

    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role: 'user',
      isEmailVerified: false,
      twoFAEnabled: false,
    })

    const verifyToken = jwt.sign(
      {
        // if there is payload in future
        // role: newUser.role,
        // email: newUser.email,
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        subject: newUser.id,
        expiresIn: '1d',
      },
    )

    const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${verifyToken}`

    await sendEmail(
      newUser.email,
      'Verify email',
      `
        <div>
          <p>Email verification link:</p>
          <a href="${verifyUrl}">Click to verify your email</a>
        </div>
      `,
    )
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
      },
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  console.log(chalkInfo('Verify email handler called!'))

  const token = req.query.token as string | undefined

  if (!token) {
    return res.status(400).json({ message: 'Invalid token' })
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!,
    ) as JwtPayload

    const user = await User.findById(payload.sub)

    if (!user) {
      return res.status(400).json({ message: 'User not found' })
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email already verified' })
    }

    user.isEmailVerified = true
    await user.save()

    return res.json({
      message: 'Email verified successfully! You can now login',
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const result = loginSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid data',
        errors: zodIssuesToFieldErrors(result.error.issues),
      })
    }

    const clientIp = getClientIp(req)
    const ipKey = keyGenAuthFns.loginIp(clientIp)
    const ipAttempts = await redis.incr(ipKey)

    if (ipAttempts === 1) {
      await redis.expire(ipKey, 900)
    }

    if (ipAttempts > 20) {
      return res.status(429).json({
        message: 'Too many login attempts from this IP. Try again later.',
      })
    }

    const { email, password, twoFAToken } = result.data
    const normalizedEmail = getNormalizedEmail(email)

    const loginAttemptsKey = keyGenAuthFns.loginAttempts(normalizedEmail)

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      const attempts = await redis.incr(loginAttemptsKey)

      if (attempts === 1) {
        await redis.expire(loginAttemptsKey, 60)
      }

      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const attempts = await redis.get(loginAttemptsKey)

    // blocking before expensive password hashing happens
    if (attempts && parseInt(attempts) >= 5) {
      return res.status(429).json({
        message: 'Too many login attempts. Try again later.',
      })
    }

    const isValidPassword = await comparePassword(password, user.passwordHash)

    if (!isValidPassword) {
      const attempts = await redis.incr(loginAttemptsKey)

      // the key has just been created
      if (attempts === 1) {
        await redis.expire(loginAttemptsKey, 900) // 15 mins
      }

      return res.status(400).json({ message: 'Invalid password' })
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Email not verified' })
    }

    // 2FA guard
    if (user.twoFAEnabled) {
      if (!twoFAToken) {
        return res.status(400).json({ message: 'Two factor token is required' })
      }

      if (!user.twoFASecret) {
        return res.status(400).json({ message: 'Two factor is not enabled' })
      }

      const { valid: isValidTwoFAToken } = await verify({
        token: twoFAToken,
        secret: user.twoFASecret,
      })

      if (!isValidTwoFAToken) {
        return res.status(400).json({ message: 'Invalid two factor code' })
      }
    }

    const accessToken = createAccessToken(user.id, user.role, user.tokenVersion)
    const refreshAccessToken = createRefreshToken(user.id, user.tokenVersion)

    const sessionId = crypto.randomUUID()

    await redis.set(
      keyGenSessionFns.session({
        userId: user.id,
        sessionId,
      }),
      refreshAccessToken,
      'EX',
      7 * 24 * 60 * 60,
    )

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', refreshAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // resetting attempts on successful login
    await redis.del(loginAttemptsKey)

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFAEnabled: user.twoFAEnabled,
      },
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' })
    }

    const payload = verifyRefreshToken(refreshToken)

    const sessionId = req.cookies?.sessionId as string | undefined
    if (!sessionId) {
      return res.status(401).json({ message: 'Session expired' })
    }

    const redisSessionToken = await redis.get(
      keyGenSessionFns.session({
        sessionId,
        userId: payload.subject,
      }),
    )

    if (redisSessionToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const user = await User.findById(payload.subject)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Refresh token expired' })
    }

    await redis.del(keyGenSessionFns.session({
      sessionId,
      userId: user.id,
    }))

    const newAccessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    )

    const newRefreshToken = createRefreshToken(user.id, user.tokenVersion)
    const newSessionId = crypto.randomUUID()

    await redis.set(
      keyGenSessionFns.session({
        sessionId: newSessionId,
        userId: user.id,
      }),
      newRefreshToken,
      'EX',
      7 * 24 * 60 * 60,
    )

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('sessionId', newSessionId, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.status(200).json({
      message: 'Token refreshed successfully!',
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFAEnabled: user.twoFAEnabled,
      },
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    const sessionId = req.cookies?.sessionId as string | undefined

    let userId: string | null = null

    const refreshToken = req.cookies?.refreshToken as string | undefined

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken)
        userId = payload.subject
      }
      catch {
        // ignoring invalid token — logout should still happen
      }
    }

    if (sessionId && userId) {
      await redis.del(keyGenSessionFns.session({
        sessionId,
        userId,
      }))
    }

    return res.status(200).json({ message: 'Logout successful' })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  } finally {
    res.clearCookie('refreshToken', { path: '/' })
    res.clearCookie('sessionId', { path: '/' })
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const { email } = req.body as { email?: string }

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  const clientIp = getClientIp(req)
  const ipKey = keyGenAuthFns.forgotIp(clientIp)
  const ipAttempts = await redis.incr(ipKey)

  if (ipAttempts === 1) {
    await redis.expire(ipKey, 900)
  }

  if (ipAttempts > 10) {
    return res.status(429).json({
      message: 'Too many login attempts from this IP. Try again later.',
    })
  }

  const normalizedEmail = getNormalizedEmail(email)

  const attemptsKey = keyGenAuthFns.forgotPasswordAttempts(normalizedEmail)

  try {
    const attempts = await redis.incr(attemptsKey)

    if (attempts === 1) {
      await redis.expire(attemptsKey, 900)
    }

    if (attempts >= 3) {
      return res.status(429).json({
        message: 'Too many forgot password attempts. Try again later.',
      })
    }

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.json({
        message:
          'If an account exists with this email, you will receive a password reset link at your email address in a few minutes.',
      })
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.resetPasswordToken = tokenHash
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)

    await user.save()

    const resetUrl = `${getAppUrl()}/auth/reset-password?token=${rawToken}`

    await sendEmail(
      user.email,
      'Reset password',
      `
        <div>
          <p>Reset password link:</p>
          <a href="${resetUrl}">Click to reset your password</a>
        </div>
      `,
    )

    return res.json({
      message:
        'If an account exists with this email, you will receive a password reset link at your email address in a few minutes.',
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { token, password } = req.body as { token?: string; password?: string }

  if (!token) return res.status(400).json({ message: 'Token is required' })

  if (!password || password.trim().length < 6)
    return res
      .status(400)
      .json({ message: 'Password must be at least 6 characters' })

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' })
    }

    const newPasswordHash = await hashPassword(password)
    user.passwordHash = newPasswordHash

    // clear reset fields
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    // update token version
    user.tokenVersion = user.tokenVersion + 1

    await user.save()

    return res.json({ message: 'Password reset successful' })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}
