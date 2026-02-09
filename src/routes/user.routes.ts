import { Request, Response, Router } from 'express'

import requireAuth from '@/middleware/requireAuth'
import { AuthRequest } from '@/types/types'

const router = Router()

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const authRequest = req as AuthRequest
  const authUser = authRequest.user

  res.json({
    user: authUser,
  })
})

export default router
