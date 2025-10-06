import { z } from 'zod'

export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

export const PaymentSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  userId: z.string(),
  amount: z.number().min(0), // Amount in USD
  currency: z.string().default('usd'),
  status: z.nativeEnum(PaymentStatus),
  stripePaymentIntentId: z.string().optional(),
  stripeClientSecret: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
})

export type Payment = z.infer<typeof PaymentSchema>

export const CreatePaymentSchema = z.object({
  rideId: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  description: z.string().optional()
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>

export const PaymentIntentResponseSchema = z.object({
  clientSecret: z.string()
})

export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>
