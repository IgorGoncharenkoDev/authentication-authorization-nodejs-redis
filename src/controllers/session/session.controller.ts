import { Request, Response } from 'express'

import { redis } from '@/config/redis'
import getSessionsList from '@/lib/getSessionsList'
import { keyGenSessionFns } from '@/redis/keys'
import { AuthRequest } from '@/types/types'

export async function getSessionsHandler(req: Request, res: Response) {
  const authReq = req as AuthRequest
  const authUser = authReq.user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const userId = authUser.id

  // find all session keys for the current user
  // (immediate return of everything, good for small data size)
  /*
  const sessionKeys = await redis.keys(keyGenSessionFns.allUserSessions(userId))
  const sessionsList = sessionKeys.map((key) => ({
    sessionId: key.split(':')[2],
    active: true,
  }))
  */

  const { sessionsList } = await getSessionsList(userId)

  return res.status(200).json({
    message: 'Sessions',
    sessionsList,
  })
}

export async function deleteSessionHandler(req: Request, res: Response) {
  const authUser = (req as AuthRequest).user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const userId = authUser.id

  const sessionId = req.params.sessionId as string

  try {
    await redis.del(
      keyGenSessionFns.session({
        userId,
        sessionId,
      }),
    )
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }

  return res.status(200).json({ message: 'Session logged out' })
}

export async function deleteAllSessionsHandler(req: Request, res: Response) {
  const authUser = (req as AuthRequest).user

  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const userId = authUser.id



  try {
    const { keys } = await getSessionsList(userId)
    await redis.del(...keys)
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }

  return res.status(200).json({ message: 'All sessions deleted' })
}