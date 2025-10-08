import { UserInfo } from '@models/user-info'

export enum RideStatus {
  Active = 'active',
  InProgress = 'in_progress',
  InRoute = 'in_route',
  OnCheckout = 'on_checkout',
  Canceled = 'canceled',
  Completed = 'completed'
}

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
  status?: RideStatus
  ratings?: string[]
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
