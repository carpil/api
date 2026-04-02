import express from 'express'
import { requestLogger } from '../middlewares/logging.middleware'
import { errorHandler } from '../middlewares/error.middleware'
import { WebhooksController } from '../controllers/webhooks.controller'
import { RepositoryFactory } from '../config/repository.factory'
import { PaymentsService } from '../services/payments.service'
import { RidesService } from '../services/rides.service'
import { UsersService } from '../services/users.service'
import { ChatsService } from '../services/chats.service'
import { RatingsService } from '../services/ratings.service'
import { NotificationsService } from '../services/notifications.service'
import { RideRequestsService } from '../services/ride-requests.service'
import { DriverApplicationService } from '../services/driver-application.service'
import { PaymentsController } from '../controllers/payments.controller'
import { RidesController } from '../controllers/rides.controller'
import { UsersController } from '../controllers/users.controller'
import { ChatsController } from '../controllers/chats.controller'
import { RatingsController } from '../controllers/ratings.controller'
import { NotificationsController } from '../controllers/notifications.controller'
import { RideRequestsController } from '../controllers/ride-requests.controller'
import { DriverApplicationController } from '../controllers/driver-application.controller'
import createRoutes from '../routes'

export const createApp = (webhooksController: WebhooksController) => {
  const app = express()
  
  // Configure webhook route BEFORE express.json() middleware
  app.post('/webhooks/stripe', express.raw({ type: '*/*' }), (req, res, next) => {
    webhooksController.handleStripeWebhook(req, res).catch(next)
  })
  
  // Apply JSON parsing to all other routes
  app.use(express.json())
  app.use(requestLogger)

  app.get('/', (_req, res) => { res.send('Welcome to Carpil') })
  
  // Initialize all repositories
  const usersRepo = RepositoryFactory.createUsersRepository()
  const ridesRepo = RepositoryFactory.createRidesRepository()
  const chatsRepo = RepositoryFactory.createChatsRepository()
  const paymentsRepo = RepositoryFactory.createPaymentsRepository()
  const ratingsRepo = RepositoryFactory.createRatingsRepository()
  const notificationsRepo = RepositoryFactory.createNotificationsRepository()
  const rideRequestsRepo = RepositoryFactory.createRideRequestsRepository()
  const driverApplicationRepo = RepositoryFactory.createDriverApplicationRepository()
  const vehicleRepo = RepositoryFactory.createVehicleRepository()

  // Initialize all services
  const paymentsService = new PaymentsService(paymentsRepo, ridesRepo, usersRepo)
  const ridesService = new RidesService(ridesRepo, usersRepo, chatsRepo, paymentsRepo)
  const usersService = new UsersService(usersRepo, new RatingsService(ratingsRepo, ridesRepo, usersRepo), ridesService, ridesRepo)
  const chatsService = new ChatsService(chatsRepo, usersRepo, ridesRepo)
  const ratingsService = new RatingsService(ratingsRepo, ridesRepo, usersRepo)
  const notificationsService = new NotificationsService(notificationsRepo)
  const rideRequestsService = new RideRequestsService(rideRequestsRepo, usersRepo)
  const driverApplicationService = new DriverApplicationService(driverApplicationRepo, vehicleRepo, usersRepo)

  // Initialize all controllers
  const paymentsController = new PaymentsController(paymentsService)
  const ridesController = new RidesController(ridesService)
  const usersController = new UsersController(usersService)
  const chatsController = new ChatsController(chatsService)
  const ratingsController = new RatingsController(ratingsService)
  const notificationsController = new NotificationsController(notificationsService)
  const rideRequestsController = new RideRequestsController(rideRequestsService)
  const driverApplicationController = new DriverApplicationController(driverApplicationService)

  // Create routes with all controllers
  const routes = createRoutes({
    paymentsController,
    ridesController,
    usersController,
    chatsController,
    ratingsController,
    notificationsController,
    rideRequestsController,
    driverApplicationController
  })

  app.use('/', routes)
  app.use(errorHandler)
  return app
}


