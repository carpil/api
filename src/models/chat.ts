import { User } from './user'
import { Ride } from './ride'

export interface Chat {
  id: string
  participants: string[]
  pastParticipants?: string[]
  owner: string
  rideId?: string
  lastMessage?: Message
  deletedAt?: Date
  createdAt: Date
  updatedAt?: Date
}

export interface Message {
  id: string
  content: string
  userId: string
  senderId?: string
  timestamp?: Date
  createdAt: Date
  seenBy?: string[]
}

export interface ChatResponse {
  id: string
  participants: User[]
  owner: User
  rideId?: string
  ride?: Ride | null
  lastMessage?: Message | null
  createdAt: Date
  updatedAt?: Date
} 