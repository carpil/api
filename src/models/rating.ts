export interface Rating {
  id: string
  userId: string
  rideId: string
  rating: number
  comment?: string
  createdAt: Date
  updatedAt: Date
}