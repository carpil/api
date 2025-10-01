import { Router } from 'express'
import { authenticate } from '@middlewares/auth.middleware'
import { UsersController } from '@controllers/users.controller'
import { UsersService } from '@services/users.service'
import { UsersRepository } from '@repositories/firebase/users.repository'
import { RidesRepository } from '@repositories/firebase/rides.repository'
import { RatingsService } from '@services/ratings.service'
import { RatingsRepository } from '@repositories/firebase/ratings.repository'
import { RidesService } from '@services/rides.service'
import { ChatsRepository } from '@repositories/firebase/chats.repository'

const router = Router()

const usersController = new UsersController(
  new UsersService(
    new UsersRepository(),
    new RatingsService(
      new RatingsRepository(),
      new RidesRepository(new UsersRepository()),
      new UsersRepository()
    ),
    new RidesService(
      new RidesRepository(new UsersRepository()),
      new UsersRepository(),
      new ChatsRepository()
    )
  )
)

router.get('/me/bootstrap', authenticate, usersController.bootstrap)
router.get('/:id', authenticate, usersController.getById)
router.post('/signup', authenticate, usersController.signup)
router.post('/login', authenticate, usersController.login)
router.post('/login/social', authenticate, usersController.loginSocial)

export default router


