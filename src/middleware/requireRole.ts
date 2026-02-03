import { NextFunction, Request, Response } from 'express'

import { UserRole } from '@/types/types'

function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any
    const authUser = authReq.user

    if (!authUser) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // console.log({ authReq, role })

    if (authUser.role !== role) {
      return res.status(403).json({ message: 'Role based access denied' })
    }

    next()
  }
}

export default requireRole
