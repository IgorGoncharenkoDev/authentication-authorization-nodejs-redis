import { redis } from '@/config/redis'

async function testRedisConnection () {
  await redis.connect()

  await redis.set('foo', 'bar')
  const result = await redis.get('foo')
  console.log(result)
}