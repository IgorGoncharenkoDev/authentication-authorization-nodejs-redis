import cookieParser from 'cookie-parser'
import express from 'express'

import adminRouter from '@/routes/admin.routes'
import authRouter from '@/routes/auth.routes'
import userRouter from '@/routes/user.routes'

const app = express()

app.use(express.json())
app.use(cookieParser())

app.get('/check', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)
app.use('/user', userRouter)
app.use('/admin', adminRouter)

export default app
