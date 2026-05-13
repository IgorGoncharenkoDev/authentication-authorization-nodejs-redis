import { Router } from 'express'

import {
  deleteAllSessionsHandler,
  deleteSessionHandler,
  getSessionsHandler,
} from '@/controllers/session/session.controller'
import requireAuth from '@/middleware/requireAuth'

const router = Router()

router.get('/', requireAuth, getSessionsHandler)
router.delete('/', requireAuth, deleteAllSessionsHandler)
router.delete('/:sessionId', requireAuth, deleteSessionHandler)

export default router