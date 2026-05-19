import { Request, Response } from 'express'

import { chalkError } from '@/config/chalk'
import { redis } from '@/config/redis'
import { zodIssuesToFieldErrors } from '@/controllers/auth/auth.controller'
import { updateUserSchema } from '@/controllers/user/user.schema'
import { User } from '@/models/user.model'
import { keyGenUserFns } from '@/redis/keys'
import { AuthRequest } from '@/types/types'

export const getMeHandler = (req: Request, res: Response) => {
  const authRequest = req as AuthRequest
  const authUser = authRequest.user

  res.json({
    user: authUser,
  })
}

export const patchMeHandler = async (req: Request, res: Response) => {
  const authRequest = req as AuthRequest
  const authUser = authRequest.user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const result = updateUserSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid data',
        errors: zodIssuesToFieldErrors(result.error.issues),
      })
    }

    const { name, role } = result.data

    if (role && authUser.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can update role',
      })
    }

    const updatedUser = await User.findByIdAndUpdate(
      authUser.id,
      {
        ...(name && { name }),
        ...(role && { role }),
      },
      { new: true },
    )

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    await redis.del(keyGenUserFns.userCache(updatedUser.id))

    return res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    })
  } catch (err) {
    console.log(chalkError(err))
    return res.status(500).json({ message: 'Internal server error' })
  }
}
