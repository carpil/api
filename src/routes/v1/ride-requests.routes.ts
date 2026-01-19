import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { RideRequestsController } from '../../controllers/ride-requests.controller'
import { validateBody } from '../../middlewares/validation.middleware'
import { CreateRideRequestSchema } from '../../models/ride-request'

const createRideRequestsRouter = (rideRequestsController: RideRequestsController) => {
  const router = Router()

  router.get('/', authenticate, (req, res, next) => rideRequestsController.list(req, res, next))
  router.get('/:id', authenticate, (req, res, next) => rideRequestsController.getById(req, res, next))
  router.post('/', authenticate, validateBody(CreateRideRequestSchema), (req, res, next) => rideRequestsController.create(req, res, next))
  router.delete('/:id', authenticate, (req, res, next) => rideRequestsController.delete(req, res, next))

  return router
}

export default createRideRequestsRouter

