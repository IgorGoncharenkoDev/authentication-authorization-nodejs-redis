import { redis } from '@/config/redis'
import { keyGenSessionFns } from '@/redis/keys'

export default async function getSessionsList(userId: string) {
  try {
    let cursor = '0'
    const keys: string[] = []

    do {
      const [nextCursor, results] = await redis.scan(
        cursor,
        'MATCH',
        keyGenSessionFns.allUserSessions(userId),
        'COUNT',
        100,
      )

      cursor = nextCursor
      keys.push(...results)
    } while (cursor !== '0')

    const sessionsList = keys.map((key) => ({
      sessionId: key.split(':')[2],
      active: true,
    }))

    return { keys, sessionsList }
  } catch (err) {
    console.log(err)
    throw err
  }
}