import { Router } from 'express'
import ridesRouter from './v1/rides.routes'
import chatsRouter from './v1/chats.routes'
import ratingsRouter from './v1/ratings.routes'
import notificationsRouter from './v1/notifications.routes'
import usersRouter from './v1/users.routes'
import paymentsRouter from './v1/payments.routes'

const router = Router()

router.use('/v1/rides', ridesRouter)
router.use('/v1/chats', chatsRouter)
router.use('/v1/ratings', ratingsRouter)
router.use('/v1/notifications', notificationsRouter)
router.use('/v1/users', usersRouter)
router.use('/v1/payments', paymentsRouter)

export default router


