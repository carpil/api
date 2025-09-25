import { Response } from 'express'
import { asyncHandler } from '../utils/http'
import { ChatsService } from '../services/chats.service'
import { MessageCreateSchema } from '../models/chat.model'
import { AuthRequest } from '../middlewares/auth.middleware'

export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  listMy = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const chats = await this.chatsService.listChats(req.user?.uid ?? '')
    res.json(chats)
  })

  get = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const chat = await this.chatsService.getChat(req.params.id, req.user?.uid ?? '')
    res.json(chat)
  })

  postMessage = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const input = MessageCreateSchema.parse(req.body)
    await this.chatsService.sendMessage(req.params.id, req.user?.uid ?? '', input.content)
    res.json({ message: 'Message sent successfully' })
  })
}


