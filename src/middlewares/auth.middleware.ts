import { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import admin from 'firebase-admin'

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1] // "Bearer <TOKEN>"
    if (token == null) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const decodedToken = await auth.verifyIdToken(token)
    req.user = decodedToken

    return next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
