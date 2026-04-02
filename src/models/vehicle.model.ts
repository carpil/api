export interface Vehicle {
  id: string
  userId: string
  applicationId: string
  brand: string
  model: string
  year: number
  color: string
  plate: string
  availableSeats: number
  createdAt: Date
  updatedAt: Date
}

export type CreateVehicleDto = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
