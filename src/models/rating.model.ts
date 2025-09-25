import { z } from 'zod'

export const RatingSchema = z.object({
  id: z.string(),
  raterId: z.string(),
  targetUserId: z.string(),
  rideId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})
export type Rating = z.infer<typeof RatingSchema>

export const CreateRatingSchema = RatingSchema.pick({
  targetUserId: true,
  rideId: true,
  rating: true,
  comment: true
})
export type CreateRatingInput = z.infer<typeof CreateRatingSchema>


