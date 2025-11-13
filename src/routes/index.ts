import { Router } from 'express'
import { PaymentsController } from '../controllers/payments.controller'
import { RidesController } from '../controllers/rides.controller'
import { UsersController } from '../controllers/users.controller'
import { ChatsController } from '../controllers/chats.controller'
import { RatingsController } from '../controllers/ratings.controller'
import { NotificationsController } from '../controllers/notifications.controller'
import { RideRequestsController } from '../controllers/ride-requests.controller'
import createRidesRouter from './v1/rides.routes'
import createChatsRouter from './v1/chats.routes'
import createRatingsRouter from './v1/ratings.routes'
import createNotificationsRouter from './v1/notifications.routes'
import createUsersRouter from './v1/users.routes'
import createPaymentsRouter from './v1/payments.routes'
import createRideRequestsRouter from './v1/ride-requests.routes'

export interface Controllers {
  paymentsController: PaymentsController
  ridesController: RidesController
  usersController: UsersController
  chatsController: ChatsController
  ratingsController: RatingsController
  notificationsController: NotificationsController
  rideRequestsController: RideRequestsController
}

const createRoutes = (controllers: Controllers) => {
  const router = Router()

  router.use('/v1/rides', createRidesRouter(controllers.ridesController, controllers.paymentsController))
  router.use('/v1/chats', createChatsRouter(controllers.chatsController))
  router.use('/v1/ratings', createRatingsRouter(controllers.ratingsController))
  router.use('/v1/notifications', createNotificationsRouter(controllers.notificationsController))
  router.use('/v1/users', createUsersRouter(controllers.usersController))
  router.use('/v1/payments', createPaymentsRouter(controllers.paymentsController))
  router.use('/v1/ride-requests', createRideRequestsRouter(controllers.rideRequestsController))

  return router
}

export default createRoutes


