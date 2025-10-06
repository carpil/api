import { z } from 'zod'

const createPaymentSchema = z.object({
  rideId: z.string().min(1, { message: 'Ride ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
  description: z.string().optional()
})

export const validateCreatePayment = (payment: any): z.SafeParseReturnType<any, any> => {
  return createPaymentSchema.safeParse(payment)
}
