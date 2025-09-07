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
  createdAt?: Date
  updatedAt?: Date
}
