import { NextFunction, Request, Response } from 'express'

export function requestLogger(_req: Request, _res: Response, next: NextFunction) {
  // Request logging removed - use a proper logging service in production
  next()
}


