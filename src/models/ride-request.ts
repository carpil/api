import { z } from 'zod'
import { LocationSchema, UserInfoSchema } from './ride.model'

export enum RideRequestStatus {
  Active = 'active',
  Canceled = 'canceled',
  Expired = 'expired'
}

export const RideRequestSchema = z.object({
  id: z.string(),
  origin: LocationSchema,
  destination: LocationSchema,
  departureDate: z.date(),
  creator: UserInfoSchema,
  status: z.nativeEnum(RideRequestStatus),
  deletedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})
export type RideRequest = z.infer<typeof RideRequestSchema>

export const CreateRideRequestSchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  departureDate: z.coerce.date()
})
export type CreateRideRequestInput = z.infer<typeof CreateRideRequestSchema>
