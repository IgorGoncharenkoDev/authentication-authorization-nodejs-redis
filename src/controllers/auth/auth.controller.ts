import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'

import { chalkError } from '@/config/chalk'
import { loginSchema, registerSchema } from '@/controllers/auth/auth.schema'
import { sendEmail } from '@/lib/email'
import { comparePassword, hashPassword } from '@/lib/hash'
import { createAccessToken, createRefreshToken } from '@/lib/token'
import { User } from '@/models/user.model'

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
  return process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`
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

    const verifyUrl = `${getAppUrl}/auth/verify?token=${verifyToken}`

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
  const token = req.query.token as string | undefined

  if (!token) {
    return res.status(400).json({ message: 'Invalid token' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      subject: string
    }

    const user = await User.findById(payload.subject)

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

    const { email, password } = result.data
    const normalizedEmail = getNormalizedEmail(email)

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isValidPassword = await comparePassword(password, user.passwordHash)

    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid password' })
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Email not verified' })
    }

    const accessToken = createAccessToken(user.id, user.role, user.tokenVersion)
    const refreshAccessToken = createRefreshToken(user.id, user.tokenVersion)

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', refreshAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFAEnabled: user.isEmailVerified,
      },
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}
