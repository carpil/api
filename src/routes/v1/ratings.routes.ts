import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { RatingsController } from '../../controllers/ratings.controller'
import { RatingsService } from '../../services/ratings.service'
import { RatingsRepository } from '../../repositories/firebase/ratings.repository'
import { RidesRepository } from '../../repositories/firebase/rides.repository'
import { UsersRepository } from '../../repositories/firebase/users.repository'
import { validateBody } from '../../middlewares/validation.middleware'
import { CreateRatingSchema } from '../../models/rating.model'

const router = Router()

const ratingsController = new RatingsController(
  new RatingsService(new RatingsRepository(), new RidesRepository(), new UsersRepository())
)

router.post('/', authenticate, validateBody(CreateRatingSchema), ratingsController.create)
router.get('/rides/:rideId/pending', authenticate, ratingsController.listPending)

export default router


