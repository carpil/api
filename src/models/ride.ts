import { UserInfo } from '@models/user-info'

export interface Ride {
  id: string
  origin: Location
  destination: Location
  meetingPoint: Location
  availableSeats: number
  price: number
  departureDate: Date
  passengers: UserInfo[]
  driver: UserInfo
  deletedAt: Date | null
  status?: 'active' | 'canceled' | 'completed'
  chatId: string
  createdAt: Date
  updatedAt: Date
}
