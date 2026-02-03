import { Request, Response, Router } from 'express'

import requireAuth from '@/middleware/requireAuth'
import requireRole from '@/middleware/requireRole'
import { User } from '@/models/user.model'

const router = Router()

const adminRole = 'admin'

router.get(
  '/users',
  requireAuth,
  requireRole(adminRole),
  async (_req: Request, res: Response) => {
    try {
      const users = await User.find(
        {},
        {
          email: 1,
          name: 1,
          role: 1,
          isEmailVerified: 1,
          createdAt: 1,
        },
      ).sort({ createdAt: -1 })

      const usersMap = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      }))

      return res.json({ users: usersMap })
    } catch {
      return res.status(500).json({ message: 'Internal server error' })
    }
  },
)

export default router
