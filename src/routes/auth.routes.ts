import { Router } from 'express'

import {
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '@/controllers/auth/auth.controller'

const router = Router()

router.post('/register', registerHandler)
router.post('/login', loginHandler)
router.get('/verify-email', verifyEmailHandler)
router.post('/refresh-token', refreshTokenHandler)
router.post('/logout', logoutHandler)
router.post('/forgot-password', forgotPasswordHandler)
router.post('/reset-password', resetPasswordHandler)

export default router
