import { Router } from 'express'
import { authenticate } from '@middlewares/auth.middleware'
import { UsersController } from '@controllers/users.controller'

const createUsersRouter = (usersController: UsersController) => {
  const router = Router()

  router.get('/me/bootstrap', authenticate, (req, res, next) => usersController.bootstrap(req, res, next))
  router.get('/:userId/info', authenticate, (req, res, next) => usersController.getUserInfo(req, res, next))
  router.get('/:id', authenticate, (req, res, next) => usersController.getById(req, res, next))
  router.post('/signup', authenticate, (req, res, next) => usersController.signup(req, res, next))
  router.post('/signup/email', authenticate, (req, res, next) => usersController.signupEmail(req, res, next))
  router.post('/login', authenticate, (req, res, next) => usersController.login(req, res, next))
  router.post('/login/social', authenticate, (req, res, next) => usersController.loginSocial(req, res, next))
  router.patch('/me', authenticate, (req, res, next) => usersController.updateProfile(req, res, next))
  router.delete('/me', authenticate, (req, res, next) => usersController.deleteAccount(req, res, next))

  return router
}

export default createUsersRouter


