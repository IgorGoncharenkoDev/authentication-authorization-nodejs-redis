import dotenv from 'dotenv'
import http from 'node:http'

import app from '@/app'
import { chalkError, chalkInfo } from '@/config/chalk'
import { connect } from '@/config/db'

dotenv.config()

async function startServer() {
  await connect()

  const server = http.createServer(app)

  const port = process.env.PORT || 5000

  server.listen(port, () => {
    console.log(chalkInfo(`Server is listening to port: ${port}`))
  })
}

startServer().catch((err) => {
  console.error(chalkError('Error when starting the server... :(', err))
  process.exit(1)
})
