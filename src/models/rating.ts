export interface Rating {
  id: string
  raterId: string
  targetUserId: string
  rideId: string
  rating: number
  comment?: string
  createdAt: Date
  updatedAt: Date
}