import { loadEnv, env } from '../config/env'
import { createApp } from './app'
import { RepositoryFactory } from '../config/repository.factory'
import { PaymentsService } from '../services/payments.service'
import { RidesService } from '../services/rides.service'
import { WebhooksController } from '../controllers/webhooks.controller'

// Load environment variables first
loadEnv()

// Initialize all repositories
const usersRepo = RepositoryFactory.createUsersRepository()
const ridesRepo = RepositoryFactory.createRidesRepository()
const chatsRepo = RepositoryFactory.createChatsRepository()
const paymentsRepo = RepositoryFactory.createPaymentsRepository()

// Initialize all services
const paymentsService = new PaymentsService(paymentsRepo)
const ridesService = new RidesService(ridesRepo, usersRepo, chatsRepo, paymentsRepo)

// Initialize webhook controller
const webhooksController = new WebhooksController(paymentsService, ridesService, usersRepo)

// Create app with pre-initialized webhook controller
const app = createApp(webhooksController)

const port = env.PORT

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})


