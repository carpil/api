import { Router } from 'express'
import { authenticate } from '@middlewares/auth.middleware'
import { ChatsController } from '@controllers/chats.controller'
import { validateBody } from '@middlewares/validation.middleware'
import { MessageCreateSchema } from '@models/chat.model'

const createChatsRouter = (chatsController: ChatsController) => {
  const router = Router()

  router.get('/', authenticate, chatsController.listMy)
  router.get('/:id', authenticate, chatsController.get)
  router.post('/:id/messages', authenticate, validateBody(MessageCreateSchema), chatsController.postMessage)

  return router
}

export default createChatsRouter


