import { Location } from './ride.model'

export interface RideInfo {
  rideId: string
  origin: Location
  destination: Location
  price: number
  completedAt: Date
}

