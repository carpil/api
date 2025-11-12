import { ChatsRepository } from '../repositories/firebase/chats.repository'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { HttpError } from '../utils/http'
import { encryptMessage, decryptMessage } from '../utils/crypto'
import { sendPushNotifications } from 'config/push-notifications'
import { RidesRepository } from '@repositories/firebase/rides.repository'

export class ChatsService {
  constructor(
    private readonly chatsRepo: ChatsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly ridesRepo: RidesRepository
  ) {}

  async listChats(currentUserId: string) {
    const chats = await this.chatsRepo.listByParticipant(currentUserId)
    if (chats.length === 0) return []

    const usersMap = new Map<string, any>()
    for (const chat of chats) {
      for (const uid of chat.participants) {
        if (!usersMap.has(uid)) {
          const u = await this.usersRepo.getById(uid)
          if (u) usersMap.set(uid, u)
        }
      }
    }

    return chats.map(chat => {
      const members = chat.participants.map((uid: string) => usersMap.get(uid)).filter(Boolean)
      const owner = members.find((m: any) => m.id === chat.owner)
      const lastMessage = chat.lastMessage
        ? { ...chat.lastMessage, content: decryptMessage(chat.lastMessage.content) }
        : undefined
      return { ...chat, participants: members, owner, lastMessage }
    })
  }

  async getChat(chatId: string, currentUserId: string) {
    const chat = await this.chatsRepo.getById(chatId)
    if (!chat) throw new HttpError(404, 'Chat not found')
    if (chat.deletedAt != null) throw new HttpError(404, 'Chat deleted')
    if (!chat.participants.includes(currentUserId)) {
      throw new HttpError(403, 'You are not a participant of this chat')
    }

    const members: any[] = []
    for (const uid of chat.participants) {
      const u = await this.usersRepo.getById(uid)
      if (u) members.push(u)
    }

    const lastMessage = chat.lastMessage
      ? { ...chat.lastMessage, content: decryptMessage(chat.lastMessage.content) }
      : undefined

    const owner = members.find(m => m.id === chat.owner)
    return { ...chat, participants: members, owner, lastMessage }
  }

  async sendMessage(chatId: string, currentUserId: string, content: string) {
    const chat = await this.chatsRepo.getById(chatId)
    if (!chat) throw new HttpError(404, 'Chat not found')
    if (chat.rideId == null) throw new HttpError(400, 'Chat is not associated with a ride')
    if (!chat.participants.includes(currentUserId)) throw new HttpError(403, 'You are not a participant of this chat')

    const now = new Date()
    const message = {
      id: '', // auto id by add()
      content: encryptMessage(content),
      createdAt: now,
      userId: currentUserId,
      seenBy: [] as string[]
    }

    await this.chatsRepo.addMessage(chatId, message as any)
    await this.chatsRepo.updateLastMessage(chatId, message as any)

    const others = chat.participants.filter((p: string) => p !== currentUserId)
    const deviceTokens: string[] = []
    for (const uid of others) {
      const u = await this.usersRepo.getById(uid)
      const tokens = u?.pushToken || []
      deviceTokens.push(...tokens)
    }

    const currentRide = await this.ridesRepo.getById(chat.rideId)
    const title = `${currentRide?.origin.name.primary} ➡️ ${currentRide?.destination.name.primary}`
    if (deviceTokens.length > 0) {
      await sendPushNotifications({
        pushTokens: deviceTokens,
        title: `${title}`,
        body: `${currentUserId} : ${content.slice(0, 80)}`,
        data: { 
          chatId, 
          senderId: currentUserId,
          url: `carpil://chats/messages/${chatId}?source=push`
        }
      })
    }
  }
}


