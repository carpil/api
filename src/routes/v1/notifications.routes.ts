import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { NotificationsController } from '../../controllers/notifications.controller'
import { NotificationsService } from '../../services/notifications.service'
import { NotificationsRepository } from '../../repositories/firebase/notifications.repository'

const router = Router()

const controller = new NotificationsController(new NotificationsService(new NotificationsRepository()))

router.post('/token', authenticate, controller.addToken)
router.post('/token/remove', authenticate, controller.removeToken)

export default router


