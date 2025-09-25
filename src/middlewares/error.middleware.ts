import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Validation error', errors: err.flatten() })
    return
  }
  const status = (err as any)?.status ?? 500
  const message = (err as any)?.message ?? 'Internal server error'
  console.error(err)
  res.status(status).json({ message })
}


