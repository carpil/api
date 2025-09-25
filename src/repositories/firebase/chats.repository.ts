import { firestore } from 'config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { Chat, Message } from '@models/chat.model'
import { IChatsRepository } from '@interfaces/repositories.interface'

export class ChatsRepository implements IChatsRepository {
  async createForRide(rideId: string, ownerId: string): Promise<{ id: string }> {
    const chatDocumentRef = firestore.collection('chats').doc()
    const newChat = {
      id: chatDocumentRef.id,
      participants: [ownerId],
      owner: ownerId,
      rideId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await chatDocumentRef.set(newChat)
    return { id: chatDocumentRef.id }
  }

  async addParticipant(chatId: string, userId: string): Promise<void> {
    await firestore.collection('chats').doc(chatId).update({
      participants: FieldValue.arrayUnion(userId),
      updatedAt: new Date()
    })
  }

  async getById(chatId: string): Promise<Chat | null> {
    const chatDocument = await firestore.collection('chats').doc(chatId).get()
    if (!chatDocument.exists) return null
    
    const chatData = chatDocument.data() as any
    return {
      ...(chatData as Chat),
      id: chatDocument.id,
      createdAt: chatData?.createdAt?.toDate?.() ?? chatData?.createdAt ?? new Date(),
      updatedAt: chatData?.updatedAt?.toDate?.() ?? chatData?.updatedAt ?? new Date(),
      deletedAt: chatData?.deletedAt?.toDate?.() ?? chatData?.deletedAt ?? null
    }
  }

  async listByParticipant(userId: string): Promise<Chat[]> {
    const chatsQuery = await firestore.collection('chats').where('participants', 'array-contains', userId).get()
    return chatsQuery.docs.map(chatDocument => {
      const chatData = chatDocument.data() as any
      return {
        ...(chatData as Chat),
        id: chatDocument.id,
        createdAt: chatData?.createdAt?.toDate?.() ?? chatData?.createdAt ?? new Date(),
        updatedAt: chatData?.updatedAt?.toDate?.() ?? chatData?.updatedAt ?? new Date(),
        deletedAt: chatData?.deletedAt?.toDate?.() ?? chatData?.deletedAt ?? null
      }
    })
  }

  async addMessage(chatId: string, newMessage: Message): Promise<void> {
    await firestore.collection(`chats/${chatId}/messages`).add(newMessage)
  }

  async updateLastMessage(chatId: string, lastMessage: Message): Promise<void> {
    await firestore.collection('chats').doc(chatId).update({ lastMessage })
  }
}


