import { z } from 'zod'

export type DriverApplicationStatus =
  | 'pending'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'

export interface DriverApplicationDocument {
  cedulaFront: string
  cedulaBack: string
  vehicleRegistration: string
  criminalRecord?: string
}

export interface DriverApplicationStatusHistory {
  status: DriverApplicationStatus
  changedAt: Date
  changedBy: string
  note?: string
}

export interface DriverApplicationVehicle {
  brand: string
  model: string
  year: number
  color: string
  plate: string
  availableSeats: number
}

export interface DriverApplication {
  id: string
  userId: string
  fullName: string
  cedula: string
  address: string
  whatsapp: string
  vehicle: DriverApplicationVehicle
  documents: DriverApplicationDocument
  status: DriverApplicationStatus
  reviewedBy?: string
  reviewNote?: string
  statusHistory: DriverApplicationStatusHistory[]
  createdAt: Date
  updatedAt: Date
}

export type CreateDriverApplicationDto = Omit<
  DriverApplication,
  'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'
>

export type UpdateDriverApplicationDto = Partial<
  Pick<
    DriverApplication,
    'reviewedBy' | 'reviewNote' | 'documents' | 'vehicle' | 'fullName' | 'cedula' | 'address' | 'whatsapp'
  >
>

export const driverApplicationVehicleSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(50),
  plate: z.string().min(1).max(20),
  availableSeats: z.number().int().min(1).max(4)
})

export const driverApplicationDocumentSchema = z.object({
  cedulaFront: z.string().url(),
  cedulaBack: z.string().url(),
  vehicleRegistration: z.string().url(),
  criminalRecord: z.string().url().optional()
})

export const CreateDriverApplicationSchema = z.object({
  fullName: z.string().min(1).max(200),
  cedula: z.string().min(9).max(12),
  address: z.string().min(1).max(500),
  whatsapp: z.string().min(8).max(20),
  vehicle: driverApplicationVehicleSchema,
  documents: driverApplicationDocumentSchema
})

export const UpdateDriverApplicationSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  cedula: z.string().min(9).max(12).optional(),
  address: z.string().min(1).max(500).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  vehicle: driverApplicationVehicleSchema.optional(),
  documents: driverApplicationDocumentSchema.optional()
})

export const UpdateApplicationStatusSchema = z.object({
  status: z.enum(['pending', 'in_review', 'changes_requested', 'approved', 'rejected']),
  note: z.string().max(1000).optional()
})
