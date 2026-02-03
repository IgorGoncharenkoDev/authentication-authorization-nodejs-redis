import { Request, Response, Router } from 'express'

import requireAuth from '@/middleware/requireAuth'

const router = Router()

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const authRequest = req as any
  const authUser = authRequest.user

  res.json({
    user: authUser,
  })
})

export default router
