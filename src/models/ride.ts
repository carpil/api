import { User } from '@models/user'

export interface Ride {
  id: string
  origin: Location
  destination: Location
  meetingPoint: Location
  availableSeats: number
  price: number
  departureDate: Date
  passengers: User[]
  driver: User
  deletedAt: Date | null
  status?: 'active' | 'canceled' | 'completed'
  chatId: string
}
