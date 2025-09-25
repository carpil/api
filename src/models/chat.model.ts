import { z } from 'zod'
import { User } from '@models/user'

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(), // encrypted at rest
  createdAt: z.date(),
  userId: z.string(),
  seenBy: z.array(z.string()).default([])
})
export type Message = z.infer<typeof MessageSchema>

export const MessageCreateSchema = z.object({
  content: z.string().min(1).max(1000)
})
export type MessageCreate = z.infer<typeof MessageCreateSchema>

export const ChatSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()),
  owner: z.string(),
  rideId: z.string().optional().nullable(),
  lastMessage: MessageSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  pastParticipants: z.array(z.string()).optional()
})
export type Chat = z.infer<typeof ChatSchema>

export type ChatResponse = Omit<Chat, 'participants' | 'owner'> & {
  participants: User[]
  owner: User
  lastMessage?: Message & { content: string } // decrypted content for response
}


