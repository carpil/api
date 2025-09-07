import { UserInfo } from '@models/user-info'

export interface Ride {
  id: string
  chatId: string
  origin: Location
  destination: Location
  meetingPoint: Location
  availableSeats: number
  price: number
  departureDate: Date
  passengers: UserInfo[]
  driver: UserInfo
  status?: 'active' | 'canceled' | 'completed'
  ratings?: string[]
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
