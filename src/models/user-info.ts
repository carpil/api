export interface UserInfo {
  id: string
  name: string
  profilePicture: string
  role: 'driver' | 'passenger'
  phoneNumber?: string
}