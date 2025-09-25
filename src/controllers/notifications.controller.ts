import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { NotificationsService } from '../services/notifications.service'
import { PushTokenSchema } from '../models/notification.model'

export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  addToken = asyncHandler<Request>(async (req: Request, res: Response) => {
    const { pushToken } = PushTokenSchema.parse(req.body)
    const result = await this.notificationsService.addToken(req.user?.uid ?? '', pushToken)
    res.json({ message: 'Push token updated successfully', ...result })
  })

  removeToken = asyncHandler<Request>(async (req: Request, res: Response) => {
    const { pushToken } = PushTokenSchema.parse(req.body)
    const result = await this.notificationsService.removeToken(req.user?.uid ?? '', pushToken)
    res.json({ message: 'Push token removed successfully', ...result })
  })
}


