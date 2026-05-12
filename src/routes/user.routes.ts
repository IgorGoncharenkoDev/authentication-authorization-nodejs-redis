import { Router } from 'express'

import { getMeHandler } from '@/controllers/user/user.controller'
import { patchMeHandler } from '@/controllers/user/user.controller'
import requireAuth from '@/middleware/requireAuth'

const router = Router()

router.get('/me', requireAuth, getMeHandler)
router.patch('/me', requireAuth, patchMeHandler)

export default router
