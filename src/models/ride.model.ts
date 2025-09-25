import { z } from 'zod'

export enum RideStatus {
  Active = 'active',
  InProgress = 'in_progress',
  InRoute = 'in_route',
  Completed = 'completed'
}

export const UserInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePicture: z.string().url().optional().nullable()
})
export type UserInfo = z.infer<typeof UserInfoSchema>

export const RideSchema = z.object({
  id: z.string(),
  origin: z.string(),
  destination: z.string(),
  meetingPoint: z.string().nullable().optional(),
  availableSeats: z.number().int().min(0),
  price: z.number().min(0),
  passengers: z.array(UserInfoSchema).default([]),
  driver: UserInfoSchema,
  chatId: z.string().optional().nullable(),
  departureDate: z.date().nullable(),
  deletedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.nativeEnum(RideStatus),
  ratings: z.array(z.string()).optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
})
export type Ride = z.infer<typeof RideSchema>

export const CreateRideSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  meetingPoint: z.string().nullable().optional(),
  availableSeats: z.number().int().min(0),
  price: z.number().min(0),
  departureDate: z.coerce.date().nullable()
})
export type CreateRideInput = z.infer<typeof CreateRideSchema>


