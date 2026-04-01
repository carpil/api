export interface User {
  id: string
  name: string
  profilePicture: string
  email?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  profileCompleted?: boolean
  pushToken?: string[]
  averageRating?: number
  currentRideId?: string | null
  inRide?: boolean
  pendingReviewRideIds?: string[]
  pendingPaymentRideIds?: string[]
  isDriver?: boolean
  driverStatus?: 'active' | 'suspended' | 'blocked'
  vehicleId?: string
  driverApplicationId?: string
  createdAt?: Date
  updatedAt?: Date
}
