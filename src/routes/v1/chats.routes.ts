import { Router } from 'express'
import { authenticate } from '@middlewares/auth.middleware'
import { ChatsController } from '@controllers/chats.controller'
import { ChatsService } from '@services/chats.service'
import { ChatsRepository } from '../../repositories/firebase/chats.repository'
import { UsersRepository } from '../../repositories/firebase/users.repository'
import { validateBody } from '@middlewares/validation.middleware'
import { MessageCreateSchema } from '@models/chat.model'

const router = Router()

const chatsController = new ChatsController(new ChatsService(new ChatsRepository(), new UsersRepository()))

router.get('/', authenticate, chatsController.listMy)
router.get('/:id', authenticate, chatsController.get)
router.post('/:id/messages', authenticate, validateBody(MessageCreateSchema), chatsController.postMessage)

export default router


