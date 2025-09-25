import { NextFunction, Request, Response } from 'express'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const asyncHandler = <R extends Request = Request>(
  fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>
) => (req: Request, res: Response, next: NextFunction) => {
  // Cast is safe because we control call sites
  Promise.resolve(fn(req as unknown as R, res, next)).catch(next)
}


