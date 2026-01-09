import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { RidesController } from '../../controllers/rides.controller'
import { PaymentsController } from '../../controllers/payments.controller'
import { validateBody } from '../../middlewares/validation.middleware'
import { CreateRideSchema } from '../../models/ride.model'

const createRidesRouter = (ridesController: RidesController, paymentsController: PaymentsController) => {
  const router = Router()

  router.get('/drivers', (req, res, next) => ridesController.listDrivers(req, res, next))
  router.get('/drivers/:id', authenticate, (req, res, next) => ridesController.getById(req, res, next))
  router.post('/', authenticate, validateBody(CreateRideSchema), (req, res, next) => ridesController.create(req, res, next))
  router.post('/:id/join', authenticate, (req, res, next) => ridesController.join(req, res, next))
  router.post('/:id/leave', authenticate, (req, res, next) => ridesController.leave(req, res, next))
  router.post('/:id/start', authenticate, (req, res, next) => ridesController.start(req, res, next))
  router.post('/:id/complete', authenticate, (req, res, next) => ridesController.complete(req, res, next))
  router.get('/:id/payments', authenticate, (req, res, next) => paymentsController.getPaymentsByRide(req, res, next))

  return router
}

export default createRidesRouter


