import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { UsersController } from '../../controllers/users.controller'
import { UsersService } from '../../services/users.service'
import { UsersRepository } from '../../repositories/firebase/users.repository'

const router = Router()

const usersController = new UsersController(new UsersService(new UsersRepository()))

router.get('/:id', authenticate, usersController.getById)
router.post('/signup', authenticate, usersController.signup)
router.post('/login', authenticate, usersController.login)
router.post('/login/social', authenticate, usersController.loginSocial)

export default router


