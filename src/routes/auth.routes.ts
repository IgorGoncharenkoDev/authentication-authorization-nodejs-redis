import { Router } from 'express'

import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from '@/controllers/auth/auth.controller'
import {
  googleAuthCallbackHandler,
  startGoogleAuthHandler,
} from '@/controllers/auth/googleAuth.controller'

const router = Router()

router.post('/register', registerHandler)
router.post('/login', loginHandler)
router.get('/verify-email', verifyEmailHandler)
router.post('/refresh-token', refreshTokenHandler)
router.post('/logout', logoutHandler)
router.post('/forgot-password', forgotPasswordHandler)
router.post('/reset-password', resetPasswordHandler)
router.get('/google', startGoogleAuthHandler)
router.get('/google/callback', googleAuthCallbackHandler)

export default router
