import { createClient } from 'redis'

import 'dotenv/config'

const redisClient = createClient({
  username: process.env.REDIS_USERNAME!,
  password: process.env.REDIS_PASSWORD!,
  socket: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT!),
  },
})

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }
}

export const redis = redisClient
