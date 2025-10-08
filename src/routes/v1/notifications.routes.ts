import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { NotificationsController } from '../../controllers/notifications.controller'

const createNotificationsRouter = (notificationsController: NotificationsController) => {
  const router = Router()

  router.post('/token', authenticate, notificationsController.addToken)
  router.post('/token/remove', authenticate, notificationsController.removeToken)

  return router
}

export default createNotificationsRouter


