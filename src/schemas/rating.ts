import { z } from 'zod'

const ratingSchema = z.object({
  userId: z.string(),
  rideId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(200, { message: 'Comment must be less than 200 characters' }).optional()
})

export const validateRating = (rating: any): z.SafeParseReturnType<any, any> => {
  return ratingSchema.safeParse(rating)
}