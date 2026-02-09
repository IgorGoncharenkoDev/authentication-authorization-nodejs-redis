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
import {
  twoFASetupHandler,
  twoFAVerifyHandler,
} from '@/controllers/auth/twoFA.controller'
import requireAuth from '@/middleware/requireAuth'

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
router.post('/2fa/setup', requireAuth, twoFASetupHandler)
router.post('/2fa/verify', requireAuth, twoFAVerifyHandler)

export default router
