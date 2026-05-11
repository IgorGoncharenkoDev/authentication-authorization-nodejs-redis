import { Request } from 'express'

export function getClientIp(req: Request): string {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  )
}