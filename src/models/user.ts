export type UserRole = 'passenger' | 'driver' | 'admin' | 'super_admin'

export interface User {
  id: string
  name: string
  profilePicture: string
  role?: UserRole
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
