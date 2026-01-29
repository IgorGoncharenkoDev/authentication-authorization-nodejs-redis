import cookieParser from 'cookie-parser'
import express from 'express'

import authRouter from '@/routes/auth.routes'

const app = express()

app.use(express.json())
app.use(cookieParser())

app.get('/check', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)

export default app
