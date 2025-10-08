import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { RatingsController } from '../../controllers/ratings.controller'
import { validateBody } from '../../middlewares/validation.middleware'
import { CreateRatingSchema } from '../../models/rating.model'

const createRatingsRouter = (ratingsController: RatingsController) => {
  const router = Router()

  router.post('/', authenticate, validateBody(CreateRatingSchema), ratingsController.create)
  router.get('/rides/:rideId/pending', authenticate, ratingsController.listPending)

  return router
}

export default createRatingsRouter


