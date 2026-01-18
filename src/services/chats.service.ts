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
  ) { }

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

    // Fetch rides for chats that have rideId
    const ridesMap = new Map<string, any>()
    for (const chat of chats) {
      if (chat.rideId && !ridesMap.has(chat.rideId)) {
        const ride = await this.ridesRepo.getById(chat.rideId)
        if (ride) ridesMap.set(chat.rideId, ride)
      }
    }

    return chats.map(chat => {
      // Map to UserInfo format (simplified)
      const members = chat.participants
        .map((uid: string) => {
          const user = usersMap.get(uid)
          return user ? { id: user.id, name: user.name, profilePicture: user.profilePicture } : null
        })
        .filter(Boolean)

      const ownerUser = usersMap.get(chat.owner)
      const owner = ownerUser
        ? { id: ownerUser.id, name: ownerUser.name, profilePicture: ownerUser.profilePicture }
        : undefined

      const lastMessage = chat.lastMessage
        ? { ...chat.lastMessage, content: decryptMessage(chat.lastMessage.content) }
        : undefined

      // Include ride information if available
      const rideInfo = chat.rideId && ridesMap.has(chat.rideId)
        ? (() => {
          const ride = ridesMap.get(chat.rideId)
          return {
            origin: ride.origin,
            destination: ride.destination,
            status: ride.status
          }
        })()
        : undefined

      return { ...chat, participants: members, owner, lastMessage, ride: rideInfo }
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

    // Map to UserInfo format (simplified)
    const participantsInfo = members.map(user => ({
      id: user.id,
      name: user.name,
      profilePicture: user.profilePicture
    }))

    const ownerUser = members.find(m => m.id === chat.owner)
    const owner = ownerUser
      ? { id: ownerUser.id, name: ownerUser.name, profilePicture: ownerUser.profilePicture }
      : undefined

    const lastMessage = chat.lastMessage
      ? { ...chat.lastMessage, content: decryptMessage(chat.lastMessage.content) }
      : undefined

    // Fetch ride information if available
    let rideInfo = undefined
    if (chat.rideId) {
      const ride = await this.ridesRepo.getById(chat.rideId)
      if (ride) {
        rideInfo = {
          origin: ride.origin,
          destination: ride.destination,
          status: ride.status
        }
      }
    }

    return { ...chat, participants: participantsInfo, owner, lastMessage, ride: rideInfo }
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
    const senderUser = await this.usersRepo.getById(currentUserId)
    const isDriver = currentUserId === currentRide?.driver.id
    const senderName = senderUser?.name || (isDriver ? 'Conductor' : 'Pasajero')
    const title = `${currentRide?.origin.name.primary} ➡️ ${currentRide?.destination.name.primary}`
    if (deviceTokens.length > 0) {
      await sendPushNotifications({
        pushTokens: deviceTokens,
        title: `${title}`,
        body: `${senderName} : ${content.slice(0, 80)}`,
        data: {
          chatId,
          senderId: currentUserId,
          url: `carpil://chats/${chatId}?source=push`
        }
      })
    }
  }
}


