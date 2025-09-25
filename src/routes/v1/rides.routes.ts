import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { RidesController } from '../../controllers/rides.controller'
import { RidesService } from '../../services/rides.service'
import { RidesRepository } from '../../repositories/firebase/rides.repository'
import { UsersRepository } from '../../repositories/firebase/users.repository'
import { ChatsRepository } from '../../repositories/firebase/chats.repository'
import { validateBody } from '../../middlewares/validation.middleware'
import { CreateRideSchema } from '../../models/ride.model'

const router = Router()

const ridesController = new RidesController(
  new RidesService(new RidesRepository(), new UsersRepository(), new ChatsRepository())
)

router.get('/drivers', ridesController.listDrivers)
router.get('/drivers/:id', authenticate, ridesController.getById)
router.post('/', authenticate, validateBody(CreateRideSchema), ridesController.create)
router.post('/:id/join', authenticate, ridesController.join)
router.post('/:id/start', authenticate, ridesController.start)
router.post('/:id/complete', authenticate, ridesController.complete)

export default router


