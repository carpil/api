import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { ChatsService } from '../services/chats.service'
import { MessageCreateSchema } from '../models/chat.model'

export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  listMy = asyncHandler<Request>(async (req: Request, res: Response) => {
    const chats = await this.chatsService.listChats(req.user?.uid ?? '')
    res.json(chats)
  })

  get = asyncHandler<Request>(async (req: Request, res: Response) => {
    const chat = await this.chatsService.getChat(req.params.id, req.user?.uid ?? '')
    res.json(chat)
  })

  postMessage = asyncHandler<Request>(async (req: Request, res: Response) => {
    const input = MessageCreateSchema.parse(req.body)
    await this.chatsService.sendMessage(req.params.id, req.user?.uid ?? '', input.content)
    res.json({ message: 'Message sent successfully' })
  })
}


